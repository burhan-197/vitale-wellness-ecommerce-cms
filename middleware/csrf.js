const crypto = require('crypto');

function attachCsrf(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrf(req, res, next) {
  const expected = String(req.session?.csrfToken || '');
  const supplied = String(req.body?._csrf || '');
  if (!expected || !supplied) return res.status(403).send('Invalid form token. Refresh the page and try again.');
  const left = Buffer.from(expected);
  const right = Buffer.from(supplied);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return res.status(403).send('Invalid form token. Refresh the page and try again.');
  }
  next();
}

function verifyStandardPosts(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if (req.is('multipart/form-data')) return next();
  return verifyCsrf(req, res, next);
}

module.exports = { attachCsrf, verifyCsrf, verifyStandardPosts };
