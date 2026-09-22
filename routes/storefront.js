const express = require('express');
const crypto = require('crypto');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');

const router = express.Router();

function normalizeQty(value) {
  const qty = Number.parseInt(value, 10);
  return Number.isInteger(qty) && qty > 0 ? Math.min(qty, 99) : 1;
}

function cartMap(req) {
  if (!req.session.cart || typeof req.session.cart !== 'object') req.session.cart = {};
  return req.session.cart;
}

async function hydrateCart(req) {
  const raw = cartMap(req);
  const ids = Object.keys(raw);
  if (!ids.length) return { items: [], subtotal: 0, count: 0 };
  const products = await Product.find({ _id: { $in: ids }, isActive: true }).lean();
  const byId = new Map(products.map(p => [String(p._id), p]));
  const items = [];
  let subtotal = 0;
  let count = 0;
  for (const [id, rawQty] of Object.entries(raw)) {
    const product = byId.get(id);
    if (!product) { delete raw[id]; continue; }
    const quantity = Math.min(normalizeQty(rawQty), Math.max(0, product.stock));
    if (quantity < 1) { delete raw[id]; continue; }
    raw[id] = quantity;
    const lineTotal = product.price * quantity;
    subtotal += lineTotal;
    count += quantity;
    items.push({ product, quantity, lineTotal });
  }
  return { items, subtotal, count };
}

router.use(async (req, res, next) => {
  try {
    const cart = await hydrateCart(req);
    res.locals.cartCount = cart.count;
    next();
  } catch (error) { next(error); }
});

router.get('/', async (req, res, next) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find({ isActive: true }).populate('category').sort({ createdAt: -1 }).limit(8).lean(),
      Category.find({}).sort({ name: 1 }).lean()
    ]);
    res.render('public/pages/home', {
      title: 'Vitale CMS Lite',
      metaDescription: 'A clean, lightweight ecommerce storefront.',
      products, categories
    });
  } catch (error) { next(error); }
});

router.get('/products', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 100);
    const categorySlug = String(req.query.category || '').trim();
    const filter = { isActive: true };
    if (q) filter.$or = [
      { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      { description: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
    ];
    if (categorySlug) {
      const category = await Category.findOne({ slug: categorySlug }).lean();
      filter.category = category?._id || null;
    }
    const [products, categories] = await Promise.all([
      Product.find(filter).populate('category').sort({ createdAt: -1 }).lean(),
      Category.find({}).sort({ name: 1 }).lean()
    ]);
    res.render('public/pages/products', {
      title: q ? `Search: ${q}` : 'Shop',
      metaDescription: 'Browse products from Vitale CMS Lite.',
      products, categories, q, categorySlug
    });
  } catch (error) { next(error); }
});

router.get('/products/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).populate('category').lean();
    if (!product) return res.status(404).render('public/pages/not-found', { title: 'Product not found' });
    res.render('public/pages/detail', {
      title: product.name,
      metaDescription: String(product.description || product.name).slice(0, 155),
      product
    });
  } catch (error) { next(error); }
});

router.get('/cart', async (req, res, next) => {
  try {
    res.render('public/pages/cart', { title: 'Cart', metaDescription: 'Your shopping cart.', cart: await hydrateCart(req) });
  } catch (error) { next(error); }
});

router.post('/cart/add', async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.body.productId, isActive: true }).lean();
    if (!product || product.stock < 1) return res.redirect('/products');
    const cart = cartMap(req);
    const current = Number(cart[String(product._id)] || 0);
    cart[String(product._id)] = Math.min(product.stock, current + normalizeQty(req.body.quantity));
    res.redirect(req.get('referer') || '/cart');
  } catch (error) { next(error); }
});

router.post('/cart/update', async (req, res, next) => {
  try {
    const cart = cartMap(req);
    const id = String(req.body.productId || '');
    const product = await Product.findById(id).lean();
    if (!product || !product.isActive) delete cart[id];
    else {
      const qty = Number.parseInt(req.body.quantity, 10);
      if (!Number.isInteger(qty) || qty <= 0) delete cart[id];
      else cart[id] = Math.min(qty, product.stock, 99);
    }
    res.redirect('/cart');
  } catch (error) { next(error); }
});

router.post('/cart/remove', (req, res) => {
  const cart = cartMap(req);
  delete cart[String(req.body.productId || '')];
  res.redirect('/cart');
});

router.get('/checkout', async (req, res, next) => {
  try {
    const cart = await hydrateCart(req);
    if (!cart.items.length) return res.redirect('/cart');
    res.render('public/pages/checkout', {
      title: 'Checkout', metaDescription: 'Complete your order.', cart, error: '', form: {}
    });
  } catch (error) { next(error); }
});

router.post('/checkout', async (req, res, next) => {
  const reserved = [];
  try {
    const cart = await hydrateCart(req);
    if (!cart.items.length) return res.redirect('/cart');
    const customer = {
      name: String(req.body.name || '').trim(),
      phone: String(req.body.phone || '').trim(),
      email: String(req.body.email || '').trim(),
      address: String(req.body.address || '').trim(),
      city: String(req.body.city || '').trim(),
      notes: String(req.body.notes || '').trim()
    };
    if (!customer.name || !customer.phone || !customer.address || !customer.city) {
      return res.status(400).render('public/pages/checkout', {
        title: 'Checkout', metaDescription: 'Complete your order.', cart,
        error: 'Name, phone, address and city are required.', form: customer
      });
    }

    for (const item of cart.items) {
      const updated = await Product.findOneAndUpdate(
        { _id: item.product._id, isActive: true, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      if (!updated) throw new Error(`Not enough stock for ${item.product.name}.`);
      reserved.push({ id: item.product._id, quantity: item.quantity });
    }

    const token = crypto.randomBytes(18).toString('hex');
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const order = await Order.create({
      orderNumber,
      publicToken: token,
      customer,
      items: cart.items.map(item => ({
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })),
      subtotal: cart.subtotal,
      total: cart.subtotal,
      paymentMethod: 'cod'
    });
    req.session.cart = {};
    res.redirect(`/order-complete/${order._id}?token=${encodeURIComponent(token)}`);
  } catch (error) {
    for (const item of reserved) {
      await Product.updateOne({ _id: item.id }, { $inc: { stock: item.quantity } }).catch(() => {});
    }
    try {
      const cart = await hydrateCart(req);
      return res.status(400).render('public/pages/checkout', {
        title: 'Checkout', metaDescription: 'Complete your order.', cart,
        error: error.message || 'Could not place the order.', form: req.body
      });
    } catch (renderError) { next(renderError); }
  }
});

router.get('/order-complete/:id', async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).select('+publicToken').lean();
    if (!order || order.publicToken !== String(req.query.token || '')) {
      return res.status(404).render('public/pages/not-found', { title: 'Order not found' });
    }
    res.render('public/pages/order-complete', {
      title: 'Order placed', metaDescription: 'Your order was placed successfully.', order
    });
  } catch (error) { next(error); }
});

module.exports = router;
