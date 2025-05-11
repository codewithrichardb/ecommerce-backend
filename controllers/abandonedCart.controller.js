const AbandonedCart = require('../models/abandonedCart.model');
const Coupon = require('../models/coupon.model');
const Cart = require('../models/cart.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const emailUtil = require('../utils/emailAbandonedCart.util');

/**
 * Save abandoned cart
 * @route POST /api/abandoned-carts
 * @access Public
 */
exports.saveAbandonedCart = async (req, res) => {
  try {
    const {
      email,
      cartItems,
      subtotal,
      couponCode,
      discountAmount,
      total
    } = req.body;

    if (!email || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: 'Email and cart items are required' });
    }

    // Check if user exists
    let userId;
    const user = await User.findOne({ email });
    if (user) {
      userId = user._id;
    }

    // Check if there's an existing abandoned cart for this email
    let abandonedCart = await AbandonedCart.findOne({
      email,
      status: 'active'
    });

    if (abandonedCart) {
      // Update existing cart
      abandonedCart.cartItems = cartItems;
      abandonedCart.subtotal = subtotal;
      abandonedCart.couponCode = couponCode;
      abandonedCart.discountAmount = discountAmount || 0;
      abandonedCart.total = total;
      abandonedCart.updatedAt = new Date();
    } else {
      // Create new abandoned cart
      abandonedCart = new AbandonedCart({
        user: userId,
        email,
        cartItems,
        subtotal,
        couponCode,
        discountAmount: discountAmount || 0,
        total,
        recoveryUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/recover-cart?token=`
      });

      // Set recovery URL with token
      abandonedCart.recoveryUrl += abandonedCart.recoveryToken;
    }

    await abandonedCart.save();

    // Schedule first recovery email
    await scheduleRecoveryEmail(abandonedCart._id);

    res.status(201).json({
      message: 'Abandoned cart saved successfully',
      recoveryUrl: abandonedCart.recoveryUrl
    });
  } catch (error) {
    console.error('Error saving abandoned cart:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Recover abandoned cart
 * @route POST /api/abandoned-carts/recover/:token
 * @access Public
 */
exports.recoverCart = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: 'Recovery token is required' });
    }

    // Find abandoned cart
    const abandonedCart = await AbandonedCart.findOne({
      recoveryToken: token,
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).populate('cartItems.product');

    if (!abandonedCart) {
      return res.status(404).json({ message: 'Invalid or expired recovery token' });
    }

    // Mark as recovered
    abandonedCart.status = 'recovered';
    abandonedCart.recoveredAt = new Date();
    await abandonedCart.save();

    // Return cart items for frontend to restore
    res.status(200).json({
      message: 'Cart recovered successfully',
      cartItems: abandonedCart.cartItems,
      couponCode: abandonedCart.couponCode
    });
  } catch (error) {
    console.error('Error recovering cart:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Track email open
 * @route GET /api/abandoned-carts/track/open/:emailId
 * @access Public
 */
exports.trackEmailOpen = async (req, res) => {
  try {
    const { emailId } = req.params;

    // Track email open
    await emailUtil.trackEmailOpen(emailId);

    // Return a 1x1 transparent pixel
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.end(pixel);
  } catch (error) {
    console.error('Error tracking email open:', error);

    // Still return a pixel to avoid breaking the email
    const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    res.end(pixel);
  }
};

/**
 * Track email click and redirect
 * @route GET /api/abandoned-carts/track/click/:emailId
 * @access Public
 */
exports.trackEmailClick = async (req, res) => {
  try {
    const { emailId } = req.params;
    const { redirectUrl } = req.query;

    // Track email click
    await emailUtil.trackEmailClick(emailId);

    // Redirect to recovery URL
    if (redirectUrl) {
      return res.redirect(redirectUrl);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking email click:', error);

    // Still redirect if possible
    if (req.query.redirectUrl) {
      return res.redirect(req.query.redirectUrl);
    }

    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Process pending abandoned cart emails
 * @route POST /api/abandoned-carts/process-emails
 * @access Private/Admin
 */
exports.processEmails = async (req, res) => {
  try {
    const result = await emailUtil.processAbandonedCartEmails();

    res.status(200).json({
      success: true,
      message: 'Abandoned cart emails processed successfully'
    });
  } catch (error) {
    console.error('Error processing abandoned cart emails:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Get abandoned cart statistics
 * @route GET /api/abandoned-carts/stats
 * @access Private/Admin
 */
exports.getAbandonedCartStats = async (req, res) => {
  try {
    // Get total carts
    const totalCarts = await AbandonedCart.countDocuments();

    // Get active carts
    const activeCarts = await AbandonedCart.countDocuments({ status: 'active' });

    // Get recovered carts
    const recoveredCarts = await AbandonedCart.countDocuments({ status: 'recovered' });

    // Get expired carts
    const expiredCarts = await AbandonedCart.countDocuments({ status: 'expired' });

    // Get total value
    const totalValueResult = await AbandonedCart.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    const totalValue = totalValueResult.length > 0 ? totalValueResult[0].total : 0;

    // Get recovered value
    const recoveredValueResult = await AbandonedCart.aggregate([
      {
        $match: { status: 'recovered' }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' }
        }
      }
    ]);
    const recoveredValue = recoveredValueResult.length > 0 ? recoveredValueResult[0].total : 0;

    // Calculate average cart value
    const averageCartValue = totalCarts > 0 ? totalValue / totalCarts : 0;

    // Calculate recovery rate
    const recoveryRate = totalCarts > 0 ? (recoveredCarts / totalCarts) * 100 : 0;

    // Get email stats
    const emailStats = {
      sent: 0,
      opened: 0,
      clicked: 0,
      openRate: 0,
      clickRate: 0,
      conversionRate: 0
    };

    // Get top abandoned products
    const topAbandonedProducts = await AbandonedCart.aggregate([
      { $unwind: '$cartItems' },
      {
        $group: {
          _id: '$cartItems.product',
          productName: { $first: '$cartItems.productName' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Get abandonment by time
    const abandonmentByTime = await AbandonedCart.aggregate([
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      totalCarts,
      activeCarts,
      recoveredCarts,
      expiredCarts,
      totalValue,
      recoveredValue,
      averageCartValue,
      recoveryRate,
      emailStats,
      topAbandonedProducts,
      abandonmentByTime: abandonmentByTime.map(item => ({
        hour: item._id,
        count: item.count
      }))
    });
  } catch (error) {
    console.error('Error getting abandoned cart stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Schedule recovery email
 * @param {string} cartId - Abandoned cart ID
 * @private
 */
const scheduleRecoveryEmail = async (cartId) => {
  try {
    const abandonedCart = await AbandonedCart.findById(cartId);

    if (!abandonedCart || abandonedCart.status !== 'active') {
      return;
    }

    // Determine which email to send based on emails sent
    let emailType, delayHours, subject, includeCoupon;

    switch (abandonedCart.emailsSent) {
      case 0:
        emailType = 'first_reminder';
        delayHours = 1; // 1 hour after abandonment
        subject = 'Did you forget something? Your cart is waiting!';
        includeCoupon = false;
        break;
      case 1:
        emailType = 'second_reminder';
        delayHours = 24; // 24 hours after first email
        subject = 'Your cart is still waiting for you!';
        includeCoupon = false;
        break;
      case 2:
        emailType = 'final_reminder';
        delayHours = 72; // 72 hours after second email
        subject = 'Last chance to complete your purchase!';
        includeCoupon = true;
        break;
      default:
        return; // No more emails to send
    }

    // Calculate scheduled time
    const scheduledFor = new Date();
    if (abandonedCart.emailsSent === 0) {
      // First email: delay from cart creation
      scheduledFor.setTime(abandonedCart.createdAt.getTime() + delayHours * 60 * 60 * 1000);
    } else {
      // Subsequent emails: delay from last email
      scheduledFor.setTime(abandonedCart.lastEmailSentAt.getTime() + delayHours * 60 * 60 * 1000);
    }

    // If scheduled time is in the past, set it to now + 5 minutes
    if (scheduledFor < new Date()) {
      scheduledFor.setTime(Date.now() + 5 * 60 * 1000);
    }

    // Create coupon if needed
    let couponCode, discountAmount;
    if (includeCoupon) {
      // Generate unique coupon code
      couponCode = `RECOVER${Math.floor(100000 + Math.random() * 900000)}`;
      discountAmount = 10; // 10% discount

      // Create coupon in database
      const coupon = new Coupon({
        code: couponCode,
        description: 'Special discount for recovering your cart',
        discountType: 'percentage',
        discountValue: discountAmount,
        minOrderValue: 0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
        status: 'active',
        usageLimit: 1,
        usageCount: 0,
        individualUseOnly: true,
        excludeSaleItems: false,
        scope: 'cart'
      });

      await coupon.save();
    }

    // Create recovery email
    const recoveryEmail = {
      emailType,
      status: 'pending',
      scheduledFor,
      subject,
      couponCode,
      discountAmount
    };

    // Add to recovery emails array
    abandonedCart.recoveryEmails.push(recoveryEmail);
    abandonedCart.emailsSent += 1;

    await abandonedCart.save();

    // In a real implementation, you would now queue this email to be sent
    // at the scheduled time using a job queue like Bull or a scheduled task

    console.log(`Scheduled ${emailType} email for abandoned cart ${cartId} at ${scheduledFor}`);
  } catch (error) {
    console.error('Error scheduling recovery email:', error);
  }
};
