const path = require('path');
const multer = require('multer');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'products');
const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const okMime = /^image\/(jpeg|png|webp|gif)$/.test(file.mimetype || '');
    if (!allowed.has(ext) || !okMime) return cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed.'));
    cb(null, true);
  }
});

module.exports = { upload };
