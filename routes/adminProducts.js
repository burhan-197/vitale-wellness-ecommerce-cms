const express = require('express');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { verifyCsrf } = require('../middleware/csrf');
const { slugify } = require('../utils/slug');

const router = express.Router();
router.use(requireAdmin);

function localImagePath(url) {
  if (!String(url || '').startsWith('/uploads/products/')) return null;
  return path.join(__dirname, '..', 'public', String(url).replace(/^\//, ''));
}
function removeImage(url) {
  const file = localImagePath(url);
  if (file) fs.unlink(file, () => {});
}
async function uniqueSlug(name, ignoreId = null) {
  const base = slugify(name) || `product-${Date.now()}`;
  let candidate = base, counter = 2;
  while (await Product.exists({ slug: candidate, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) candidate = `${base}-${counter++}`;
  return candidate;
}

router.get('/admin/products', async (req, res, next) => {
  try {
    const [products, categories] = await Promise.all([
      Product.find({}).populate('category').sort({ createdAt: -1 }).lean(),
      Category.find({}).sort({ name: 1 }).lean()
    ]);
    const editProduct = req.query.edit ? await Product.findById(req.query.edit).lean() : null;
    res.render('admin/pages/products', { title: 'Products', products, categories, editProduct, error: String(req.query.error || ''), success: String(req.query.success || '') });
  } catch (error) { next(error); }
});

router.post('/admin/products', upload.single('image'), verifyCsrf, async (req, res, next) => {
  try {
    const category = await Category.findById(req.body.category);
    if (!category) throw new Error('Choose a valid category.');
    const price = Number(req.body.price), stock = Number(req.body.stock);
    if (!req.body.name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) throw new Error('Enter a valid name, price and whole-number stock quantity.');
    await Product.create({
      name: String(req.body.name).trim(),
      slug: await uniqueSlug(req.body.name),
      description: String(req.body.description || '').trim(),
      price, stock,
      category: category._id,
      image: req.file ? `/uploads/products/${req.file.filename}` : '/images/product-placeholder.svg',
      isActive: req.body.isActive === 'on'
    });
    res.redirect('/admin/products?success=Product+created');
  } catch (error) {
    if (req.file) removeImage(`/uploads/products/${req.file.filename}`);
    res.redirect(`/admin/products?error=${encodeURIComponent(error.message || 'Could not create product')}`);
  }
});

router.post('/admin/products/:id/update', upload.single('image'), verifyCsrf, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw new Error('Product not found.');
    const category = await Category.findById(req.body.category);
    const price = Number(req.body.price), stock = Number(req.body.stock);
    if (!category || !req.body.name || !Number.isFinite(price) || price <= 0 || !Number.isInteger(stock) || stock < 0) throw new Error('Enter valid product details.');
    const oldImage = product.image;
    product.name = String(req.body.name).trim();
    product.slug = await uniqueSlug(req.body.name, product._id);
    product.description = String(req.body.description || '').trim();
    product.price = price;
    product.stock = stock;
    product.category = category._id;
    product.isActive = req.body.isActive === 'on';
    if (req.file) product.image = `/uploads/products/${req.file.filename}`;
    await product.save();
    if (req.file) removeImage(oldImage);
    res.redirect('/admin/products?success=Product+updated');
  } catch (error) {
    if (req.file) removeImage(`/uploads/products/${req.file.filename}`);
    res.redirect(`/admin/products?edit=${encodeURIComponent(req.params.id)}&error=${encodeURIComponent(error.message || 'Could not update product')}`);
  }
});

router.post('/admin/products/:id/delete', async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (product) removeImage(product.image);
    res.redirect('/admin/products?success=Product+deleted');
  } catch (error) { next(error); }
});

module.exports = router;
