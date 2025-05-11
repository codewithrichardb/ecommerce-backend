const Coupon = require('../models/coupon.model');
const CouponUsage = require('../models/couponUsage.model');
const User = require('../models/user.model');
const Order = require('../models/order.model');
const Cart = require('../models/cart.model');

/**
 * Create a new coupon
 * @route POST /api/coupons
 * @access Admin only
 */
exports.createCoupon = async (req, res) => {
  try {
    // Validate request
    const {
      code,
      discountType,
      discountValue,
      startDate,
      endDate,
      status,
      scope
    } = req.body;

    if (!code || !discountType || discountValue === undefined || !startDate || !scope) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    // Create new coupon
    const coupon = new Coupon({
      ...req.body,
      code: code.toUpperCase()
    });

    // Save coupon
    await coupon.save();

    res.status(201).json({
      message: 'Coupon created successfully',
      coupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get all coupons
 * @route GET /api/coupons
 * @access Admin only
 */
exports.getAllCoupons = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get coupons
    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Get total count
    const totalCoupons = await Coupon.countDocuments(query);
    
    res.status(200).json({
      coupons,
      totalPages: Math.ceil(totalCoupons / parseInt(limit)),
      currentPage: parseInt(page),
      totalCoupons
    });
  } catch (error) {
    console.error('Error getting coupons:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get coupon by ID
 * @route GET /api/coupons/:id
 * @access Admin only
 */
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    
    res.status(200).json(coupon);
  } catch (error) {
    console.error('Error getting coupon:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update coupon
 * @route PUT /api/coupons/:id
 * @access Admin only
 */
exports.updateCoupon = async (req, res) => {
  try {
    // Check if coupon exists
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    
    // If code is being updated, check if it already exists
    if (req.body.code && req.body.code !== coupon.code) {
      const existingCoupon = await Coupon.findOne({ code: req.body.code.toUpperCase() });
      if (existingCoupon) {
        return res.status(400).json({ message: 'Coupon code already exists' });
      }
      
      // Ensure code is uppercase
      req.body.code = req.body.code.toUpperCase();
    }
    
    // Update coupon
    const updatedCoupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      message: 'Coupon updated successfully',
      coupon: updatedCoupon
    });
  } catch (error) {
    console.error('Error updating coupon:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Delete coupon
 * @route DELETE /api/coupons/:id
 * @access Admin only
 */
exports.deleteCoupon = async (req, res) => {
  try {
    // Check if coupon exists
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }
    
    // Delete coupon
    await Coupon.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Validate coupon
 * @route POST /api/coupons/validate
 * @access Public
 */
exports.validateCoupon = async (req, res) => {
  try {
    const { code, cartId } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }
    
    // Find coupon
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    
    if (!coupon) {
      return res.status(404).json({ 
        isValid: false,
        message: 'Invalid coupon code' 
      });
    }
    
    // Check if coupon is valid
    if (!coupon.isValid()) {
      let message = 'This coupon is not valid';
      
      if (coupon.status !== 'active') {
        message = 'This coupon is no longer active';
      } else if (coupon.startDate > new Date()) {
        message = `This coupon is not valid until ${new Date(coupon.startDate).toLocaleDateString()}`;
      } else if (coupon.endDate && coupon.endDate < new Date()) {
        message = `This coupon expired on ${new Date(coupon.endDate).toLocaleDateString()}`;
      } else if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
        message = 'This coupon has reached its usage limit';
      }
      
      return res.status(400).json({
        isValid: false,
        message
      });
    }
    
    // If user is logged in, check if they've used this coupon before
    if (req.user && coupon.usageLimit > 0) {
      const userUsage = await CouponUsage.countDocuments({
        couponId: coupon._id,
        userId: req.user._id
      });
      
      if (userUsage > 0) {
        return res.status(400).json({
          isValid: false,
          message: 'You have already used this coupon'
        });
      }
    }
    
    // If cartId is provided, check minimum order value
    let subtotal = 0;
    let discountAmount = 0;
    
    if (cartId) {
      const cart = await Cart.findById(cartId).populate('items.product');
      
      if (!cart) {
        return res.status(404).json({ message: 'Cart not found' });
      }
      
      // Calculate subtotal
      subtotal = cart.items.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
      }, 0);
      
      // Check minimum order value
      if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue) {
        return res.status(400).json({
          isValid: false,
          message: `This coupon requires a minimum order of $${coupon.minOrderValue.toFixed(2)}`
        });
      }
      
      // Calculate discount
      discountAmount = coupon.calculateDiscount(subtotal, cart.items);
    }
    
    res.status(200).json({
      isValid: true,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
        endDate: coupon.endDate,
        scope: coupon.scope
      },
      discountAmount,
      subtotal
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Apply coupon to cart
 * @route POST /api/coupons/apply
 * @access Public
 */
exports.applyCoupon = async (req, res) => {
  try {
    const { code, cartId } = req.body;
    
    if (!code || !cartId) {
      return res.status(400).json({ message: 'Coupon code and cart ID are required' });
    }
    
    // Find coupon
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    
    if (!coupon) {
      return res.status(404).json({ 
        success: false,
        message: 'Invalid coupon code' 
      });
    }
    
    // Check if coupon is valid
    if (!coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'This coupon is not valid'
      });
    }
    
    // Find cart
    const cart = await Cart.findById(cartId).populate('items.product');
    
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    
    // Calculate subtotal
    const subtotal = cart.items.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
    
    // Check minimum order value
    if (coupon.minOrderValue > 0 && subtotal < coupon.minOrderValue) {
      return res.status(400).json({
        success: false,
        message: `This coupon requires a minimum order of $${coupon.minOrderValue.toFixed(2)}`
      });
    }
    
    // Calculate discount
    const discountAmount = coupon.calculateDiscount(subtotal, cart.items);
    
    // Update cart with coupon
    cart.coupon = {
      code: coupon.code,
      discountAmount
    };
    
    await cart.save();
    
    res.status(200).json({
      success: true,
      message: 'Coupon applied successfully',
      coupon: {
        id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue
      },
      discountAmount,
      subtotalBeforeDiscount: subtotal,
      subtotalAfterDiscount: subtotal - discountAmount
    });
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get available coupons for user
 * @route GET /api/coupons/available
 * @access Public
 */
exports.getAvailableCoupons = async (req, res) => {
  try {
    const now = new Date();
    
    // Find active coupons
    const coupons = await Coupon.find({
      status: 'active',
      startDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: { $gt: now } }
      ]
    }).select('-productIds -categoryIds -customerIds');
    
    res.status(200).json(coupons);
  } catch (error) {
    console.error('Error getting available coupons:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get coupon usage statistics
 * @route GET /api/coupons/stats
 * @access Admin only
 */
exports.getCouponStats = async (req, res) => {
  try {
    // Get total coupons
    const totalCoupons = await Coupon.countDocuments();
    
    // Get active coupons
    const activeCoupons = await Coupon.countDocuments({ status: 'active' });
    
    // Get expired coupons
    const expiredCoupons = await Coupon.countDocuments({ status: 'expired' });
    
    // Get total usage
    const totalUsage = await CouponUsage.countDocuments();
    
    // Get total discount amount
    const totalDiscountAmount = await CouponUsage.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$discountAmount' }
        }
      }
    ]);
    
    // Get most used coupons
    const mostUsedCoupons = await Coupon.aggregate([
      {
        $sort: { usageCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          _id: 1,
          code: 1,
          usageCount: 1
        }
      }
    ]);
    
    // Get highest value coupons
    const highestValueCoupons = await CouponUsage.aggregate([
      {
        $group: {
          _id: '$couponId',
          couponCode: { $first: '$couponCode' },
          totalDiscountAmount: { $sum: '$discountAmount' }
        }
      },
      {
        $sort: { totalDiscountAmount: -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    res.status(200).json({
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      totalUsage,
      totalDiscountAmount: totalDiscountAmount.length > 0 ? totalDiscountAmount[0].total : 0,
      mostUsedCoupons,
      highestValueCoupons
    });
  } catch (error) {
    console.error('Error getting coupon stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
