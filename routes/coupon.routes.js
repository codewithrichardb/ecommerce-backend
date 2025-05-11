const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { protect, admin } = require('../middleware/auth.middleware');

// Public routes
router.post('/validate', couponController.validateCoupon);
router.post('/apply', couponController.applyCoupon);
router.get('/available', couponController.getAvailableCoupons);

// Admin routes
router.post('/', protect, admin, couponController.createCoupon);
router.get('/', protect, admin, couponController.getAllCoupons);
router.get('/stats', protect, admin, couponController.getCouponStats);
router.get('/:id', protect, admin, couponController.getCouponById);
router.put('/:id', protect, admin, couponController.updateCoupon);
router.delete('/:id', protect, admin, couponController.deleteCoupon);

module.exports = router;
