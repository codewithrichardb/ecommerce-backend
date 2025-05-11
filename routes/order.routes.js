const express = require('express');
const router = express.Router();
const { 
  createOrder, 
  getOrderById, 
  updateOrderToPaid, 
  updateOrderToDelivered,
  getMyOrders,
  getOrdersByStatus
} = require('../controllers/order.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Create a new order
router.post('/', verifyToken, createOrder);

// Get order by ID
router.get('/:id', verifyToken, getOrderById);

// Update order to paid
router.put('/:id/pay', verifyToken, updateOrderToPaid);

// Update order to delivered (admin only)
router.put('/:id/deliver', verifyToken, isAdmin, updateOrderToDelivered);

// Get logged in user's orders
router.get('/myorders', verifyToken, getMyOrders);

// Get orders by status (admin only)
router.get('/status/:status', verifyToken, isAdmin, getOrdersByStatus);

module.exports = router;
