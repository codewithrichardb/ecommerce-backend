const express = require('express');
const router = express.Router();
const { 
  getUserProfile, 
  updateUserProfile, 
  addAddress, 
  updateAddress, 
  deleteAddress,
  setDefaultAddress,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Get user profile
router.get('/profile', verifyToken, getUserProfile);

// Update user profile
router.put('/profile', verifyToken, updateUserProfile);

// Address management
router.post('/address', verifyToken, addAddress);
router.put('/address/:addressId', verifyToken, updateAddress);
router.delete('/address/:addressId', verifyToken, deleteAddress);
router.put('/address/:addressId/default', verifyToken, setDefaultAddress);

// Wishlist management
router.get('/wishlist', verifyToken, getWishlist);
router.post('/wishlist/:productId', verifyToken, addToWishlist);
router.delete('/wishlist/:productId', verifyToken, removeFromWishlist);

// Cart management
router.get('/cart', verifyToken, getCart);
router.post('/cart', verifyToken, addToCart);
router.put('/cart/:itemId', verifyToken, updateCartItem);
router.delete('/cart/:itemId', verifyToken, removeFromCart);
router.delete('/cart', verifyToken, clearCart);

module.exports = router;
