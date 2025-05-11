const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const {
  createPaymentIntent,
  handleWebhook,
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod
} = require('../controllers/payment.controller');

/**
 * @route   POST /api/payment/create-payment-intent
 * @desc    Create a payment intent
 * @access  Private
 */
router.post('/create-payment-intent', verifyToken, createPaymentIntent);

/**
 * @route   POST /api/payment/webhook
 * @desc    Handle Stripe webhook events
 * @access  Public
 */
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

/**
 * @route   GET /api/payment/methods
 * @desc    Get user's payment methods
 * @access  Private
 */
router.get('/methods', verifyToken, getPaymentMethods);

/**
 * @route   POST /api/payment/methods
 * @desc    Add a payment method
 * @access  Private
 */
router.post('/methods', verifyToken, addPaymentMethod);

/**
 * @route   DELETE /api/payment/methods/:id
 * @desc    Delete a payment method
 * @access  Private
 */
router.delete('/methods/:id', verifyToken, deletePaymentMethod);

module.exports = router;
