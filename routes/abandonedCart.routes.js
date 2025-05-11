const express = require('express');
const router = express.Router();
const abandonedCartController = require('../controllers/abandonedCart.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Public routes
router.post('/', abandonedCartController.saveAbandonedCart);
router.post('/recover/:token', abandonedCartController.recoverCart);
router.get('/track/open/:emailId', abandonedCartController.trackEmailOpen);
router.get('/track/click/:emailId', abandonedCartController.trackEmailClick);

// Admin routes
router.get('/stats', verifyToken, isAdmin, abandonedCartController.getAbandonedCartStats);
router.post('/process-emails', verifyToken, isAdmin, abandonedCartController.processEmails);

module.exports = router;
