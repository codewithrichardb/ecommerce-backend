const Product = require('../models/product.model');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const { uploadSingleProductImage, deleteImage, getPublicIdFromUrl } = require('../utils/cloudinary.util');

/**
 * Get dashboard statistics
 * @route GET /api/admin/dashboard
 * @access Private/Admin
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Get total products
    const totalProducts = await Product.countDocuments();

    // Get total orders
    const totalOrders = await Order.countDocuments();

    // Get total users
    const totalUsers = await User.countDocuments();

    // Get total revenue
    const orders = await Order.find({ isPaid: true });
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    // Get recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'firstName lastName email');

    // Get top selling products
    const topProducts = await Product.find()
      .sort({ numSales: -1 })
      .limit(5);

    res.json({
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      recentOrders,
      topProducts
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a product
 * @route POST /api/admin/products
 * @access Private/Admin
 */
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      brand,
      countInStock,
      sizes,
      colors,
      isFeatured
    } = req.body;

    // Validate required fields
    if (!name || !description || !price || !category) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Create product
    const product = new Product({
      name,
      description,
      price,
      category,
      brand,
      countInStock: countInStock || 0,
      sizes: sizes || [],
      colors: colors || [],
      isFeatured: isFeatured || false
    });

    const createdProduct = await product.save();

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a product
 * @route PUT /api/admin/products/:id
 * @access Private/Admin
 */
exports.updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      brand,
      countInStock,
      sizes,
      colors,
      isFeatured
    } = req.body;

    // Find product
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = category || product.category;
    product.brand = brand || product.brand;
    product.countInStock = countInStock !== undefined ? countInStock : product.countInStock;
    product.sizes = sizes || product.sizes;
    product.colors = colors || product.colors;
    product.isFeatured = isFeatured !== undefined ? isFeatured : product.isFeatured;

    const updatedProduct = await product.save();

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a product
 * @route DELETE /api/admin/products/:id
 * @access Private/Admin
 */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete product images from Cloudinary if they exist
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        try {
          const publicId = getPublicIdFromUrl(imageUrl);
          if (publicId) {
            await deleteImage(publicId);
            console.log(`Deleted image: ${publicId}`);
          }
        } catch (error) {
          console.error('Error deleting product image from Cloudinary:', error);
        }
      }
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: 'Product removed' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Upload product image
 * @route POST /api/admin/products/:id/upload
 * @access Private/Admin
 */
exports.uploadProductImage = async (req, res) => {
  try {
    // Find product first to make sure it exists
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Use Cloudinary upload middleware
    uploadSingleProductImage(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Please upload an image' });
      }

      // Get the Cloudinary URL from the uploaded file
      const imageUrl = req.file.path;

      // Initialize images array if it doesn't exist
      if (!product.images) {
        product.images = [];
      }

      // Add image to product
      product.images.push(imageUrl);

      // If this is the first image, set it as the main image
      if (!product.mainImage) {
        product.mainImage = imageUrl;
      }

      await product.save();

      res.json({
        message: 'Image uploaded successfully',
        image: imageUrl,
        product
      });
    });
  } catch (error) {
    console.error('Error uploading product image:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all orders
 * @route GET /api/admin/orders
 * @access Private/Admin
 */
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = {};

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Count total documents
    const total = await Order.countDocuments(query);

    // Find orders
    const orders = await Order.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      orders,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update order status
 * @route PUT /api/admin/orders/:id/status
 * @access Private/Admin
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Update status
    order.status = status;

    // Update related fields based on status
    if (status === 'Shipped') {
      order.isShipped = true;
      order.shippedAt = Date.now();
    } else if (status === 'Delivered') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    } else if (status === 'Cancelled') {
      order.isCancelled = true;
      order.cancelledAt = Date.now();
    }

    const updatedOrder = await order.save();

    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get all users
 * @route GET /api/admin/users
 * @access Private/Admin
 */
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Count total documents
    const total = await User.countDocuments();

    // Find users
    const users = await User.find()
      .select('-passwordResetToken -passwordResetExpires -verificationToken -verificationTokenExpires')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      users,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
