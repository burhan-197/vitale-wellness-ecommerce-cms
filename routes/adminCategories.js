const express = require('express');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { requireAdmin } = require('../middleware/auth');
const { slugify } = require('../utils/slug');

const router = express.Router();
router.use(requireAdmin);

async function uniqueSlug(name, ignoreId = null) {
  const base = slugify(name) || `category-${Date.now()}`;
  let candidate = base, counter = 2;
  while (await Category.exists({ slug: candidate, ...(ignoreId ? { _id: { $ne: ignoreId } } : {}) })) candidate = `${base}-${counter++}`;
  return candidate;
}

router.get('/admin/categories', async (req, res, next) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 }).lean();
    const editCategory = req.query.edit ? await Category.findById(req.query.edit).lean() : null;
    res.render('admin/pages/categories', { title: 'Categories', categories, editCategory, error: String(req.query.error || ''), success: String(req.query.success || '') });
  } catch (error) { next(error); }
});

router.post('/admin/categories', async (req, res, next) => {
  try {
    if (!String(req.body.name || '').trim()) throw new Error('Category name is required.');
    await Category.create({ name: String(req.body.name).trim(), slug: await uniqueSlug(req.body.name), description: String(req.body.description || '').trim() });
    res.redirect('/admin/categories?success=Category+created');
  } catch (error) { res.redirect(`/admin/categories?error=${encodeURIComponent(error.message || 'Could not create category')}`); }
});

router.post('/admin/categories/:id/update', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) throw new Error('Category not found.');
    category.name = String(req.body.name || '').trim();
    if (!category.name) throw new Error('Category name is required.');
    category.slug = await uniqueSlug(category.name, category._id);
    category.description = String(req.body.description || '').trim();
    await category.save();
    res.redirect('/admin/categories?success=Category+updated');
  } catch (error) { res.redirect(`/admin/categories?edit=${encodeURIComponent(req.params.id)}&error=${encodeURIComponent(error.message || 'Could not update category')}`); }
});

router.post('/admin/categories/:id/delete', async (req, res, next) => {
  try {
    if (await Product.exists({ category: req.params.id })) {
      return res.redirect('/admin/categories?error=Move+or+delete+products+in+this+category+first');
    }
    await Category.findByIdAndDelete(req.params.id);
    res.redirect('/admin/categories?success=Category+deleted');
  } catch (error) { next(error); }
});

module.exports = router;
