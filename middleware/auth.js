function requireAdmin(req, res, next) {
  if (!req.session?.adminUserId) {
    return res.redirect('/admin/login');
  }
  next();
}

function exposeSession(req, res, next) {
  res.locals.adminLoggedIn = Boolean(req.session?.adminUserId);
  next();
}

module.exports = { requireAdmin, exposeSession };
