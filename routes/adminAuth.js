const express = require('express');
const rateLimit = require('express-rate-limit');
const AdminUser = require('../models/AdminUser');
const { hashPassword, verifyPassword } = require('../utils/password');

const router = express.Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });

async function adminExists() {
  return (await AdminUser.countDocuments({})) > 0;
}

router.get('/admin', async (req, res, next) => {
  try {
    if (!(await adminExists())) return res.redirect('/admin/setup');
    if (!req.session.adminUserId) return res.redirect('/admin/login');
    return res.redirect('/admin/products');
  } catch (error) { next(error); }
});

router.get('/admin/setup', async (req, res, next) => {
  try {
    if (await adminExists()) return res.redirect('/admin/login');
    res.render('admin/pages/setup', { title: 'Create admin', error: '' });
  } catch (error) { next(error); }
});

router.post('/admin/setup', async (req, res, next) => {
  try {
    if (await adminExists()) return res.redirect('/admin/login');
    if (process.env.ADMIN_SETUP_TOKEN && req.body.setupToken !== process.env.ADMIN_SETUP_TOKEN) {
      return res.status(403).render('admin/pages/setup', { title: 'Create admin', error: 'Invalid setup token.' });
    }
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || '').trim() || 'Admin';
    if (username.length < 3 || password.length < 8) {
      return res.status(400).render('admin/pages/setup', { title: 'Create admin', error: 'Use a username of at least 3 characters and a password of at least 8 characters.' });
    }
    const admin = await AdminUser.create({ username, displayName, passwordHash: await hashPassword(password) });
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.adminUserId = String(admin._id);
      res.redirect('/admin/products');
    });
  } catch (error) {
    if (error?.code === 11000) return res.redirect('/admin/login');
    next(error);
  }
});

router.get('/admin/login', async (req, res, next) => {
  try {
    if (!(await adminExists())) return res.redirect('/admin/setup');
    if (req.session.adminUserId) return res.redirect('/admin/products');
    res.render('admin/pages/login', { title: 'Admin login', error: '' });
  } catch (error) { next(error); }
});

router.post('/admin/login', loginLimiter, async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const admin = await AdminUser.findOne({ usernameNormalized: username }).select('+usernameNormalized +passwordHash');
    if (!admin || !(await verifyPassword(req.body.password || '', admin.passwordHash))) {
      return res.status(401).render('admin/pages/login', { title: 'Admin login', error: 'Invalid username or password.' });
    }
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.adminUserId = String(admin._id);
      admin.lastLoginAt = new Date();
      admin.save().catch(() => {});
      res.redirect('/admin/products');
    });
  } catch (error) { next(error); }
});

router.post('/admin/logout', (req, res, next) => {
  req.session.destroy(error => error ? next(error) : res.redirect('/admin/login'));
});

module.exports = router;
