const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
  description: { type: String, default: '', trim: true, maxlength: 500 }
}, { timestamps: true });

module.exports = mongoose.model('Category', CategorySchema);
