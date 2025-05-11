const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const importController = require('../controllers/import.controller');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Apply both middleware to all routes
router.use(verifyToken, isAdmin);

// User management
router.get('/users', adminController.getUsers);
// These routes are not implemented yet in the controller
// router.get('/users/:id', adminController.getUserById);
// router.put('/users/:id', adminController.updateUser);
// router.delete('/users/:id', adminController.deleteUser);

// Product management
router.post('/products', adminController.createProduct);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.post('/products/:id/upload', adminController.uploadProductImage);

// Product Import
router.post('/products/import', importController.importProducts);
router.get('/products/import/template/csv', importController.downloadCSVTemplate);
router.get('/products/import/template/excel', importController.downloadExcelTemplate);

// Order management
router.get('/orders', adminController.getOrders);
router.put('/orders/:id/status', adminController.updateOrderStatus);

// Dashboard statistics
router.get('/dashboard/stats', adminController.getDashboardStats);

module.exports = router;
