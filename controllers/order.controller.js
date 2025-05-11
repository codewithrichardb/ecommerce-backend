const Order = require('../models/order.model');
const User = require('../models/user.model');
const Product = require('../models/product.model');
const Cart = require('../models/cart.model');
const Coupon = require('../models/coupon.model');
const CouponUsage = require('../models/couponUsage.model');
const { sendOrderConfirmationEmail } = require('../utils/email.util');

/**
 * Create new order
 * @route POST /api/orders
 * @access Private
 */
exports.createOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
      discountPrice = 0,
      couponCode
    } = req.body;

    // Validate input
    if (orderItems && orderItems.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    // Create order
    const order = new Order({
      user: req.userId,
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      discountPrice,
      couponCode,
      totalPrice
    });

    // Save order
    const createdOrder = await order.save();

    // Record coupon usage if a coupon was used
    if (couponCode && discountPrice > 0) {
      try {
        // Find the coupon
        const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

        if (coupon) {
          // Increment usage count
          coupon.usageCount += 1;
          await coupon.save();

          // Record usage
          const couponUsage = new CouponUsage({
            couponId: coupon._id,
            couponCode: coupon.code,
            userId: req.userId,
            orderId: createdOrder._id,
            discountAmount: discountPrice
          });

          await couponUsage.save();
        }
      } catch (error) {
        console.error('Error recording coupon usage:', error);
        // Continue even if coupon recording fails
      }
    }

    // Clear user's cart
    const user = await User.findById(req.userId);

    // Find and clear the user's cart
    const cart = await Cart.findOne({ user: req.userId });
    if (cart) {
      cart.items = [];
      cart.totalItems = 0;
      cart.totalPrice = 0;
      cart.coupon = undefined;
      await cart.save();
    }

    // Clear legacy cart if it exists
    if (user.cart && user.cart.length > 0) {
      user.cart = [];
      await user.save();
    }

    // Send order confirmation email
    try {
      await sendOrderConfirmationEmail(createdOrder, user);
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      // Continue even if email fails
    }

    res.status(201).json(createdOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get order by ID
 * @route GET /api/orders/:id
 * @access Private
 */
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('orderItems.product');

    // Check if order exists
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is authorized to view this order
    if (order.user._id.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error getting order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update order to paid
 * @route PUT /api/orders/:id/pay
 * @access Private
 */
exports.updateOrderToPaid = async (req, res) => {
  try {
    const {
      id,
      status,
      update_time,
      payer
    } = req.body;

    const order = await Order.findById(req.params.id);

    // Check if order exists
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order
    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      id,
      status,
      update_time,
      email_address: payer.email_address
    };

    // Update order status
    order.status = 'Processing';

    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order to paid:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update order to delivered
 * @route PUT /api/orders/:id/deliver
 * @access Private/Admin
 */
exports.updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    // Check if order exists
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update order
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = 'Delivered';

    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order to delivered:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get logged in user's orders
 * @route GET /api/orders/myorders
 * @access Private
 */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.userId })
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('Error getting my orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get orders by status (admin only)
 * @route GET /api/orders/status/:status
 * @access Private/Admin
 */
exports.getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate status
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status) && status !== 'all') {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Build query
    const query = status === 'all' ? {} : { status };

    // Count total documents
    const total = await Order.countDocuments(query);

    // Find orders
    const orders = await Order.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      orders,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error getting orders by status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Cancel order
 * @route PUT /api/orders/:id/cancel
 * @access Private
 */
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    // Check if order exists
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is authorized to cancel this order
    if (order.user.toString() !== req.userId && req.userRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Check if order can be cancelled
    if (order.status === 'Delivered' || order.status === 'Shipped') {
      return res.status(400).json({ message: 'Cannot cancel order that has been shipped or delivered' });
    }

    // Update order
    order.status = 'Cancelled';
    order.cancelledAt = Date.now();

    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Process payment with Stripe
 * @route POST /api/orders/payment
 * @access Private
 */
exports.processPayment = async (req, res) => {
  try {
    const { orderId, paymentMethodId } = req.body;

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is authorized
    if (order.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if order is already paid
    if (order.isPaid) {
      return res.status(400).json({ message: 'Order is already paid' });
    }

    // Initialize Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalPrice * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethodId,
      confirm: true,
      description: `Order ${order._id} payment`
    });

    // Update order if payment succeeded
    if (paymentIntent.status === 'succeeded') {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.status = 'Processing';
      order.paymentResult = {
        id: paymentIntent.id,
        status: paymentIntent.status,
        update_time: new Date().toISOString(),
        email_address: paymentIntent.receipt_email
      };

      const updatedOrder = await order.save();

      res.json({
        success: true,
        order: updatedOrder
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment failed'
      });
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment failed'
    });
  }
};
