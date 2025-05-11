const User = require('../models/user.model');
const Product = require('../models/product.model');
const mongoose = require('mongoose');

/**
 * Get user profile
 * @route GET /api/users/profile
 * @access Private
 */
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('-passwordResetToken -passwordResetExpires -verificationToken -verificationTokenExpires');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @access Private
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    
    // Save user
    const updatedUser = await user.save();
    
    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add address
 * @route POST /api/users/address
 * @access Private
 */
exports.addAddress = async (req, res) => {
  try {
    const {
      fullName,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      phone,
      isDefault
    } = req.body;
    
    // Validate required fields
    if (!fullName || !addressLine1 || !city || !state || !postalCode || !country || !phone) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create new address
    const newAddress = {
      fullName,
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      state,
      postalCode,
      country,
      phone,
      isDefault: isDefault || false
    };
    
    // If this is the first address or marked as default, update other addresses
    if (newAddress.isDefault || user.addresses.length === 0) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
      newAddress.isDefault = true;
    }
    
    // Add address to user
    user.addresses.push(newAddress);
    await user.save();
    
    res.status(201).json(newAddress);
  } catch (error) {
    console.error('Error adding address:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update address
 * @route PUT /api/users/address/:addressId
 * @access Private
 */
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const {
      fullName,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      phone,
      isDefault
    } = req.body;
    
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find address
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Update address fields
    if (fullName) address.fullName = fullName;
    if (addressLine1) address.addressLine1 = addressLine1;
    address.addressLine2 = addressLine2 || '';
    if (city) address.city = city;
    if (state) address.state = state;
    if (postalCode) address.postalCode = postalCode;
    if (country) address.country = country;
    if (phone) address.phone = phone;
    
    // Handle default address
    if (isDefault && !address.isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = addr._id.toString() === addressId;
      });
    }
    
    await user.save();
    
    res.json(address);
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete address
 * @route DELETE /api/users/address/:addressId
 * @access Private
 */
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find address
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Check if it's the default address
    const isDefault = address.isDefault;
    
    // Remove address
    user.addresses.pull(addressId);
    
    // If the deleted address was the default and we have other addresses,
    // make the first one the new default
    if (isDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }
    
    await user.save();
    
    res.json({ message: 'Address removed' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Set default address
 * @route PUT /api/users/address/:addressId/default
 * @access Private
 */
exports.setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find address
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Set as default
    user.addresses.forEach(addr => {
      addr.isDefault = addr._id.toString() === addressId;
    });
    
    await user.save();
    
    res.json({ message: 'Default address updated' });
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get wishlist
 * @route GET /api/users/wishlist
 * @access Private
 */
exports.getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('wishlist');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ products: user.wishlist });
  } catch (error) {
    console.error('Error getting wishlist:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add to wishlist
 * @route POST /api/users/wishlist/:productId
 * @access Private
 */
exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Validate product ID
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if product is already in wishlist
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }
    
    // Add to wishlist
    user.wishlist.push(productId);
    await user.save();
    
    res.status(201).json({ message: 'Product added to wishlist' });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Remove from wishlist
 * @route DELETE /api/users/wishlist/:productId
 * @access Private
 */
exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove from wishlist
    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();
    
    res.json({ message: 'Product removed from wishlist' });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get cart
 * @route GET /api/users/cart
 * @access Private
 */
exports.getCart = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate('cart.product');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Calculate totals
    const items = user.cart;
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const subtotal = items.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
    
    res.json({
      items,
      itemCount,
      subtotal
    });
  } catch (error) {
    console.error('Error getting cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add to cart
 * @route POST /api/users/cart
 * @access Private
 */
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity, size, color } = req.body;
    
    // Validate input
    if (!productId || !quantity || !size || !color) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if product already exists in cart with same size and color
    const existingItemIndex = user.cart.findIndex(
      item => 
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
    );
    
    if (existingItemIndex !== -1) {
      // Update quantity if item exists
      user.cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item
      user.cart.push({
        product: productId,
        quantity,
        size,
        color
      });
    }
    
    await user.save();
    
    // Return updated cart
    const updatedUser = await User.findById(req.userId).populate('cart.product');
    
    res.status(201).json({
      items: updatedUser.cart,
      itemCount: updatedUser.cart.reduce((total, item) => total + item.quantity, 0),
      subtotal: updatedUser.cart.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
      }, 0)
    });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update cart item
 * @route PUT /api/users/cart/:itemId
 * @access Private
 */
exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    
    // Validate quantity
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1' });
    }
    
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find cart item
    const cartItem = user.cart.id(itemId);
    if (!cartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }
    
    // Update quantity
    cartItem.quantity = quantity;
    await user.save();
    
    // Return updated cart
    const updatedUser = await User.findById(req.userId).populate('cart.product');
    
    res.json({
      items: updatedUser.cart,
      itemCount: updatedUser.cart.reduce((total, item) => total + item.quantity, 0),
      subtotal: updatedUser.cart.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
      }, 0)
    });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Remove from cart
 * @route DELETE /api/users/cart/:itemId
 * @access Private
 */
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove item from cart
    user.cart.pull(itemId);
    await user.save();
    
    // Return updated cart
    const updatedUser = await User.findById(req.userId).populate('cart.product');
    
    res.json({
      items: updatedUser.cart,
      itemCount: updatedUser.cart.reduce((total, item) => total + item.quantity, 0),
      subtotal: updatedUser.cart.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
      }, 0)
    });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Clear cart
 * @route DELETE /api/users/cart
 * @access Private
 */
exports.clearCart = async (req, res) => {
  try {
    // Find user
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Clear cart
    user.cart = [];
    await user.save();
    
    res.json({
      items: [],
      itemCount: 0,
      subtotal: 0
    });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
