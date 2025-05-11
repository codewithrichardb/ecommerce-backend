const Product = require('../models/product.model');
const Review = require('../models/review.model');

// Get all products with pagination and filtering
exports.getAllProducts = async (req, res) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.page) || 1;

    // Build filter object
    const filter = {};

    // Category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Subcategory filter
    if (req.query.subCategory) {
      filter.subCategory = req.query.subCategory;
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }

    // Brand filter
    if (req.query.brand) {
      filter.brand = req.query.brand;
    }

    // Size filter
    if (req.query.size) {
      filter['sizes.name'] = req.query.size;
    }

    // Color filter
    if (req.query.color) {
      filter['colors.name'] = req.query.color;
    }

    // Sale filter
    if (req.query.onSale === 'true') {
      filter.onSale = true;
    }

    // Only active products
    filter.isActive = true;

    // Sort options
    let sortOption = {};
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'price_asc':
          sortOption = { price: 1 };
          break;
        case 'price_desc':
          sortOption = { price: -1 };
          break;
        case 'newest':
          sortOption = { createdAt: -1 };
          break;
        case 'rating':
          sortOption = { avgRating: -1 };
          break;
        default:
          sortOption = { createdAt: -1 };
      }
    } else {
      sortOption = { createdAt: -1 };
    }

    const count = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort(sortOption)
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.status(200).json({
      products,
      page,
      pages: Math.ceil(count / pageSize),
      totalProducts: count
    });
  } catch (error) {
    console.error('Get all products error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('Get product by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Search products
exports.searchProducts = async (req, res) => {
  try {
    const { query } = req.params;
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.page) || 1;

    const count = await Product.countDocuments({
      $text: { $search: query },
      isActive: true
    });

    const products = await Product.find({
      $text: { $search: query },
      isActive: true
    })
      .sort({ score: { $meta: 'textScore' } })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.status(200).json({
      products,
      page,
      pages: Math.ceil(count / pageSize),
      totalProducts: count
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get products by category
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const pageSize = Number(req.query.pageSize) || 10;
    const page = Number(req.query.page) || 1;

    const count = await Product.countDocuments({
      category,
      isActive: true
    });

    const products = await Product.find({
      category,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.status(200).json({
      products,
      page,
      pages: Math.ceil(count / pageSize),
      totalProducts: count
    });
  } catch (error) {
    console.error('Get products by category error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get featured products
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({
      featured: true,
      isActive: true
    }).limit(8);

    res.status(200).json(products);
  } catch (error) {
    console.error('Get featured products error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get new arrivals
exports.getNewArrivals = async (req, res) => {
  try {
    const products = await Product.find({
      newArrival: true,
      isActive: true
    }).limit(8);

    res.status(200).json(products);
  } catch (error) {
    console.error('Get new arrivals error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get best sellers
exports.getBestSellers = async (req, res) => {
  try {
    const products = await Product.find({
      bestSeller: true,
      isActive: true
    }).limit(8);

    res.status(200).json(products);
  } catch (error) {
    console.error('Get best sellers error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get related products
exports.getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      category: product.category,
      isActive: true
    }).limit(4);

    res.status(200).json(relatedProducts);
  } catch (error) {
    console.error('Get related products error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a product review
exports.createProductReview = async (req, res) => {
  try {
    const { rating, title, comment, images } = req.body;
    const productId = req.params.id;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user already reviewed this product
    const alreadyReviewed = await Review.findOne({
      user: req.userId,
      product: productId
    });

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Product already reviewed' });
    }

    // Create review
    const review = await Review.create({
      user: req.userId,
      product: productId,
      rating: Number(rating),
      title,
      comment,
      images: images || []
    });

    // Update product rating
    const reviews = await Review.find({ product: productId });
    product.numReviews = reviews.length;
    product.avgRating = reviews.reduce((acc, item) => item.rating + acc, 0) / reviews.length;

    await product.save();

    res.status(201).json({ message: 'Review added', review });
  } catch (error) {
    console.error('Create product review error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
