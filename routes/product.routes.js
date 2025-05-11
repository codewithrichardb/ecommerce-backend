const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  searchProducts,
  getProductsByCategory,
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  getRelatedProducts,
  createProductReview
} = require('../controllers/product.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// Get all products with pagination and filtering
router.get('/', getAllProducts);

// Get a single product by ID
router.get('/:id', getProductById);

// Search products
router.get('/search/:query', searchProducts);

// Get products by category
router.get('/category/:category', getProductsByCategory);

// Get featured products
router.get('/featured/all', getFeaturedProducts);

// Get new arrivals
router.get('/new-arrivals/all', getNewArrivals);

// Get best sellers
router.get('/best-sellers/all', getBestSellers);

// Get sale products
router.get('/sale/all', (req, res) => {
  req.query.onSale = 'true';
  getAllProducts(req, res);
});

// Get related products
router.get('/:id/related', getRelatedProducts);

// Create a product review
router.post('/:id/reviews', verifyToken, createProductReview);

module.exports = router;
