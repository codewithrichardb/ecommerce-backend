const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, min: 0 },
  onSale: { type: Boolean, default: false },
  category: {
    type: String,
    required: true,
    enum: ['men', 'women', 'kids', 'accessories', 'shoes']
  },
  subCategory: { type: String, required: true },
  tags: [{ type: String }],
  sizes: [{
    name: { type: String, required: true },
    inventory: { type: Number, required: true, min: 0 }
  }],
  colors: [{
    name: { type: String, required: true },
    hexCode: { type: String, required: true },
    images: [{ type: String }]
  }],
  mainImage: { type: String, required: true },
  images: [{ type: String }],
  featured: { type: Boolean, default: false },
  newArrival: { type: Boolean, default: false },
  bestSeller: { type: Boolean, default: false },
  sku: { type: String, required: true, unique: true },
  brand: { type: String, required: true },
  material: { type: String },
  careInstructions: { type: String },
  sizeGuide: { type: String },
  avgRating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Add text index for search functionality
productSchema.index({
  name: 'text',
  description: 'text',
  brand: 'text',
  tags: 'text'
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
