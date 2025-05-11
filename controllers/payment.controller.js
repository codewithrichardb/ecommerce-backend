const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/order.model');
const User = require('../models/user.model');

/**
 * Create payment intent
 * @route POST /api/payment/create-payment-intent
 * @access Private
 */
exports.createPaymentIntent = async (req, res) => {
  try {
    const { orderId } = req.body;
    
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
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalPrice * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        userId: req.userId
      }
    });
    
    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Webhook handler for Stripe events
 * @route POST /api/payment/webhook
 * @access Public
 */
exports.handleWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
  
  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  // Return a 200 response to acknowledge receipt of the event
  res.json({ received: true });
};

/**
 * Handle successful payment
 * @param {Object} paymentIntent - Stripe payment intent object
 */
const handlePaymentIntentSucceeded = async (paymentIntent) => {
  try {
    const { orderId } = paymentIntent.metadata;
    
    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`Order not found: ${orderId}`);
      return;
    }
    
    // Update order
    order.isPaid = true;
    order.paidAt = Date.now();
    order.status = 'Processing';
    order.paymentResult = {
      id: paymentIntent.id,
      status: paymentIntent.status,
      update_time: new Date().toISOString(),
      email_address: paymentIntent.receipt_email
    };
    
    await order.save();
    
    console.log(`Payment for order ${orderId} processed successfully`);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
};

/**
 * Handle failed payment
 * @param {Object} paymentIntent - Stripe payment intent object
 */
const handlePaymentIntentFailed = async (paymentIntent) => {
  try {
    const { orderId } = paymentIntent.metadata;
    
    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      console.error(`Order not found: ${orderId}`);
      return;
    }
    
    // Update order status
    order.paymentResult = {
      id: paymentIntent.id,
      status: 'failed',
      update_time: new Date().toISOString(),
      error: paymentIntent.last_payment_error?.message || 'Payment failed'
    };
    
    await order.save();
    
    console.log(`Payment for order ${orderId} failed`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};

/**
 * Get payment methods for user
 * @route GET /api/payment/methods
 * @access Private
 */
exports.getPaymentMethods = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If user has a Stripe customer ID, fetch their payment methods
    if (user.stripeCustomerId) {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card'
      });
      
      return res.json(paymentMethods.data);
    }
    
    // If user doesn't have a Stripe customer ID yet
    res.json([]);
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add payment method
 * @route POST /api/payment/methods
 * @access Private
 */
exports.addPaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If user doesn't have a Stripe customer ID yet, create one
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user._id.toString()
        }
      });
      
      user.stripeCustomerId = customer.id;
      await user.save();
    }
    
    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.stripeCustomerId
    });
    
    // Set as default payment method
    await stripe.customers.update(user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
    
    res.json({ message: 'Payment method added successfully' });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete payment method
 * @route DELETE /api/payment/methods/:id
 * @access Private
 */
exports.deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(req.userId);
    if (!user || !user.stripeCustomerId) {
      return res.status(404).json({ message: 'User not found or no payment methods' });
    }
    
    // Detach payment method
    await stripe.paymentMethods.detach(id);
    
    res.json({ message: 'Payment method removed successfully' });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
