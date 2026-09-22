const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAdmin);
const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

router.get('/admin/orders', async (req, res, next) => {
  try {
    const orders = await Order.find({}).sort({ createdAt: -1 }).lean();
    res.render('admin/pages/orders', { title: 'Orders', orders, statuses, success: String(req.query.success || ''), error: String(req.query.error || '') });
  } catch (error) { next(error); }
});

router.post('/admin/orders/:id/status', async (req, res, next) => {
  try {
    const targetStatus = String(req.body.status || '');
    if (!statuses.includes(targetStatus)) return res.status(400).send('Invalid status');

    if (targetStatus === 'cancelled') {
      const order = await Order.findOneAndUpdate(
        { _id: req.params.id, status: { $ne: 'cancelled' } },
        { $set: { status: 'cancelled' } },
        { new: false }
      );
      if (!order) {
        const existing = await Order.exists({ _id: req.params.id });
        if (!existing) return res.status(404).send('Order not found');
        return res.redirect('/admin/orders?success=Order+updated');
      }
      for (const item of order.items) {
        await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
      }
      return res.redirect('/admin/orders?success=Order+cancelled+and+stock+restored');
    }

    const updated = await Order.findOneAndUpdate(
      { _id: req.params.id, status: { $ne: 'cancelled' } },
      { $set: { status: targetStatus } },
      { new: true }
    );
    if (!updated) {
      const existing = await Order.exists({ _id: req.params.id });
      if (!existing) return res.status(404).send('Order not found');
      return res.redirect('/admin/orders?error=Cancelled+orders+cannot+be+reopened+in+Lite');
    }
    res.redirect('/admin/orders?success=Order+updated');
  } catch (error) { next(error); }
});

module.exports = router;
