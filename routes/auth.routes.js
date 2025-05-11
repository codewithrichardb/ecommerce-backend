const express = require('express');
const router = express.Router();
const { register, login, forgotPassword, resetPassword, verifyEmail, refreshToken } = require('../controllers/auth.controller');

// Register a new user
router.post('/register', register);

// Login user
router.post('/login', login);

// Forgot password
router.post('/forgot-password', forgotPassword);

// Reset password
router.post('/reset-password/:token', resetPassword);

// Verify email
router.get('/verify-email/:token', verifyEmail);

// Refresh token
router.post('/refresh-token', refreshToken);

module.exports = router;
