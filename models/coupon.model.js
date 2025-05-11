const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    required: false
  },
  discountType: {
    type: String,
    required: true,
    enum: ['percentage', 'fixed', 'free_shipping', 'buy_x_get_y']
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderValue: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  maxDiscountAmount: {
    type: Number,
    required: false,
    min: 0
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: false
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'expired', 'scheduled', 'used', 'disabled'],
    default: 'active'
  },
  usageLimit: {
    type: Number,
    required: false,
    min: 0,
    default: 0 // 0 means unlimited
  },
  usageCount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  individualUseOnly: {
    type: Boolean,
    required: true,
    default: false
  },
  excludeSaleItems: {
    type: Boolean,
    required: true,
    default: false
  },
  scope: {
    type: String,
    required: true,
    enum: ['cart', 'product', 'category', 'customer'],
    default: 'cart'
  },
  productIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  categoryIds: [{
    type: String
  }],
  customerIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  buyXGetY: {
    buyQuantity: {
      type: Number,
      min: 1
    },
    getQuantity: {
      type: Number,
      min: 1
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    categoryId: {
      type: String
    }
  }
}, {
  timestamps: true
});

// Add index for faster lookups
couponSchema.index({ code: 1 });
couponSchema.index({ status: 1 });
couponSchema.index({ startDate: 1, endDate: 1 });

// Method to check if coupon is valid
couponSchema.methods.isValid = function() {
  const now = new Date();
  
  // Check if coupon is active
  if (this.status !== 'active') {
    return false;
  }
  
  // Check if coupon has started
  if (this.startDate > now) {
    return false;
  }
  
  // Check if coupon has expired
  if (this.endDate && this.endDate < now) {
    return false;
  }
  
  // Check if usage limit is reached
  if (this.usageLimit > 0 && this.usageCount >= this.usageLimit) {
    return false;
  }
  
  return true;
};

// Method to apply coupon to cart
couponSchema.methods.calculateDiscount = function(subtotal, items = []) {
  // If coupon is not valid, return 0 discount
  if (!this.isValid()) {
    return 0;
  }
  
  // Check minimum order value
  if (this.minOrderValue > 0 && subtotal < this.minOrderValue) {
    return 0;
  }
  
  let discount = 0;
  
  switch (this.discountType) {
    case 'percentage':
      discount = subtotal * (this.discountValue / 100);
      break;
    case 'fixed':
      discount = Math.min(this.discountValue, subtotal);
      break;
    case 'free_shipping':
      // This would be handled separately in the shipping calculation
      discount = 0;
      break;
    case 'buy_x_get_y':
      // This is a simplified implementation
      // In a real app, you would need to check the items in the cart
      if (this.buyXGetY) {
        // For simplicity, we'll just apply a percentage discount
        discount = subtotal * 0.1; // 10% discount as placeholder
      }
      break;
  }
  
  // Apply maximum discount if specified
  if (this.maxDiscountAmount && discount > this.maxDiscountAmount) {
    discount = this.maxDiscountAmount;
  }
  
  return discount;
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
