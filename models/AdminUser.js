const mongoose = require('mongoose');

const AdminUserSchema = new mongoose.Schema({
  singletonKey: { type: String, default: 'primary', unique: true, immutable: true, select: false },
  displayName: { type: String, default: 'Admin', trim: true, maxlength: 100 },
  username: { type: String, required: true, trim: true, maxlength: 80 },
  usernameNormalized: { type: String, required: true, unique: true, index: true, select: false },
  passwordHash: { type: String, required: true, select: false },
  lastLoginAt: { type: Date, default: null }
}, { timestamps: true });

AdminUserSchema.pre('validate', function () {
  this.username = String(this.username || '').trim();
  this.usernameNormalized = this.username.toLowerCase();
  this.displayName = String(this.displayName || '').trim() || 'Admin';
});

module.exports = mongoose.model('AdminUser', AdminUserSchema);
