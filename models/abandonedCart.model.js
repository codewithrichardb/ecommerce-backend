const mongoose = require('mongoose');
const crypto = require('crypto');

const abandonedCartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String
  },
  variantId: {
    type: String
  },
  variantName: {
    type: String
  },
  size: {
    type: String
  },
  color: {
    type: String
  }
});

const abandonedCartEmailSchema = new mongoose.Schema({
  emailType: {
    type: String,
    required: true,
    enum: ['first_reminder', 'second_reminder', 'final_reminder', 'discount_offer']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'sent', 'failed', 'opened', 'clicked'],
    default: 'pending'
  },
  sentAt: {
    type: Date
  },
  openedAt: {
    type: Date
  },
  clickedAt: {
    type: Date
  },
  scheduledFor: {
    type: Date,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  couponCode: {
    type: String
  },
  discountAmount: {
    type: Number,
    min: 0
  }
}, { timestamps: true });

const abandonedCartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  cartItems: [abandonedCartItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  couponCode: {
    type: String
  },
  discountAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'recovered', 'expired', 'converted'],
    default: 'active'
  },
  recoveryUrl: {
    type: String
  },
  recoveryToken: {
    type: String,
    default: () => crypto.randomBytes(20).toString('hex')
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  recoveredAt: {
    type: Date
  },
  lastEmailSentAt: {
    type: Date
  },
  emailsSent: {
    type: Number,
    default: 0
  },
  emailsOpened: {
    type: Number,
    default: 0
  },
  emailsClicked: {
    type: Number,
    default: 0
  },
  recoveryEmails: [abandonedCartEmailSchema],
  metadata: {
    type: Map,
    of: String
  }
}, { timestamps: true });

// Add indexes for faster lookups
abandonedCartSchema.index({ email: 1 });
abandonedCartSchema.index({ status: 1 });
abandonedCartSchema.index({ recoveryToken: 1 });
abandonedCartSchema.index({ createdAt: 1 });
abandonedCartSchema.index({ expiresAt: 1 });

const AbandonedCart = mongoose.model('AbandonedCart', abandonedCartSchema);

module.exports = AbandonedCart;
