const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 140 },
  slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
  description: { type: String, default: '', trim: true, maxlength: 3000 },
  price: { type: Number, required: true, min: 0.01 },
  stock: { type: Number, required: true, default: 0, min: 0, validate: Number.isInteger },
  image: { type: String, default: '/images/product-placeholder.svg', trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
