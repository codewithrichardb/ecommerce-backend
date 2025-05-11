const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Create a Cloudinary storage instance for product images
 */
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'fashion-store/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1000, height: 1000, crop: 'limit' },
      { quality: 'auto:good' }
    ],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = file.originalname.split('.')[0];
      return `product-${filename}-${uniqueSuffix}`;
    }
  }
});

/**
 * Create a Cloudinary storage instance for user avatars
 */
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'fashion-store/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' }
    ],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      return `avatar-${req.userId}-${uniqueSuffix}`;
    }
  }
});

/**
 * Create a Cloudinary storage instance for category images
 */
const categoryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'fashion-store/categories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 800, height: 600, crop: 'fill' },
      { quality: 'auto:good' }
    ],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = file.originalname.split('.')[0];
      return `category-${filename}-${uniqueSuffix}`;
    }
  }
});

/**
 * Create a Cloudinary storage instance for banner images
 */
const bannerStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'fashion-store/banners',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1920, height: 600, crop: 'fill' },
      { quality: 'auto:good' }
    ],
    public_id: (req, file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = file.originalname.split('.')[0];
      return `banner-${filename}-${uniqueSuffix}`;
    }
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

// Create multer upload instances
const uploadProductImage = multer({
  storage: productStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const uploadAvatarImage = multer({
  storage: avatarStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  }
});

const uploadCategoryImage = multer({
  storage: categoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 3 * 1024 * 1024 // 3MB limit
  }
});

const uploadBannerImage = multer({
  storage: bannerStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * Upload a single product image
 */
exports.uploadSingleProductImage = uploadProductImage.single('image');

/**
 * Upload multiple product images
 * @param {number} maxCount - Maximum number of images to upload
 */
exports.uploadMultipleProductImages = (maxCount = 5) => uploadProductImage.array('images', maxCount);

/**
 * Upload a user avatar
 */
exports.uploadAvatar = uploadAvatarImage.single('avatar');

/**
 * Upload a category image
 */
exports.uploadCategoryImage = uploadCategoryImage.single('image');

/**
 * Upload a banner image
 */
exports.uploadBannerImage = uploadBannerImage.single('image');

/**
 * Handle multer errors
 */
exports.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files. Maximum is 5 files per upload.'
      });
    }
    return res.status(400).json({
      message: `Upload error: ${err.message}`
    });
  }
  
  if (err) {
    return res.status(400).json({
      message: err.message
    });
  }
  
  next();
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 * @returns {Promise} - Cloudinary deletion result
 */
exports.deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
};

/**
 * Get Cloudinary public ID from URL
 * @param {string} url - Cloudinary URL
 * @returns {string} - Public ID
 */
exports.getPublicIdFromUrl = (url) => {
  if (!url) return null;
  
  try {
    // Extract the public ID from the URL
    // Example URL: https://res.cloudinary.com/demo/image/upload/v1612345678/fashion-store/products/product-name-123456789.jpg
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const folderPath = urlParts[urlParts.length - 2];
    const publicId = `${folderPath}/${filename.split('.')[0]}`;
    
    return publicId;
  } catch (error) {
    console.error('Error extracting public ID from URL:', error);
    return null;
  }
};

// Export cloudinary instance for direct operations
exports.cloudinary = cloudinary;
