const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const Product = require('../models/product.model');

/**
 * Parse CSV file and return array of product objects
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Array>} - Array of product objects
 */
exports.parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

/**
 * Parse Excel file and return array of product objects
 * @param {string} filePath - Path to Excel file
 * @returns {Array} - Array of product objects
 */
exports.parseExcel = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const products = xlsx.utils.sheet_to_json(worksheet);
    
    return products;
  } catch (error) {
    throw new Error(`Error parsing Excel file: ${error.message}`);
  }
};

/**
 * Determine file type based on extension
 * @param {string} filePath - Path to file
 * @returns {string} - File type ('csv', 'excel', or 'unknown')
 */
exports.getFileType = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  
  if (extension === '.csv') {
    return 'csv';
  } else if (['.xlsx', '.xls'].includes(extension)) {
    return 'excel';
  } else {
    return 'unknown';
  }
};

/**
 * Transform raw product data from import file to match Product model schema
 * @param {Array} rawProducts - Array of raw product objects from import file
 * @returns {Array} - Array of transformed product objects
 */
exports.transformProductData = (rawProducts) => {
  return rawProducts.map(product => {
    // Basic product data
    const transformedProduct = {
      name: product.name || product.Name || product.PRODUCT_NAME || product.product_name || '',
      description: product.description || product.Description || product.DESCRIPTION || product.product_description || '',
      price: parseFloat(product.price || product.Price || product.PRICE || 0),
      category: product.category || product.Category || product.CATEGORY || '',
      subCategory: product.subCategory || product.sub_category || product.SubCategory || product.SUB_CATEGORY || '',
      brand: product.brand || product.Brand || product.BRAND || '',
      sku: product.sku || product.SKU || product.product_code || product.ProductCode || '',
      material: product.material || product.Material || product.MATERIAL || '',
      careInstructions: product.careInstructions || product.care_instructions || product.Care || '',
      sizeGuide: product.sizeGuide || product.size_guide || product.SizeGuide || '',
      inStock: product.inStock === 'false' ? false : Boolean(product.inStock || product.in_stock || product.InStock || true)
    };
    
    // Handle sale price and sale status
    if (product.salePrice || product.sale_price || product.SalePrice) {
      transformedProduct.salePrice = parseFloat(product.salePrice || product.sale_price || product.SalePrice);
      transformedProduct.onSale = true;
    }
    
    // Handle featured, new arrival, best seller flags
    transformedProduct.featured = product.featured === 'true' || product.Featured === 'true' || false;
    transformedProduct.newArrival = product.newArrival === 'true' || product.new_arrival === 'true' || product.NewArrival === 'true' || false;
    transformedProduct.bestSeller = product.bestSeller === 'true' || product.best_seller === 'true' || product.BestSeller === 'true' || false;
    
    // Handle sizes (comma-separated string expected in CSV/Excel)
    if (product.sizes || product.Sizes || product.SIZES) {
      const sizesStr = product.sizes || product.Sizes || product.SIZES;
      try {
        // Try to parse as JSON if it's in JSON format
        transformedProduct.sizes = JSON.parse(sizesStr);
      } catch (e) {
        // If not JSON, try to parse as comma-separated string
        const sizesArray = sizesStr.split(',').map(size => size.trim());
        transformedProduct.sizes = sizesArray.map(size => {
          // Check if size has inventory information (e.g., "S:10")
          if (size.includes(':')) {
            const [name, inventory] = size.split(':');
            return { name, inventory: parseInt(inventory, 10) || 0 };
          }
          return { name: size, inventory: 0 };
        });
      }
    } else {
      transformedProduct.sizes = [];
    }
    
    // Handle colors (comma-separated string expected in CSV/Excel)
    if (product.colors || product.Colors || product.COLORS) {
      const colorsStr = product.colors || product.Colors || product.COLORS;
      try {
        // Try to parse as JSON if it's in JSON format
        transformedProduct.colors = JSON.parse(colorsStr);
      } catch (e) {
        // If not JSON, try to parse as comma-separated string
        const colorsArray = colorsStr.split(',').map(color => color.trim());
        transformedProduct.colors = colorsArray.map(color => {
          // Check if color has hex code (e.g., "Red:#FF0000")
          if (color.includes(':')) {
            const [name, hexCode] = color.split(':');
            return { name, hexCode, images: [] };
          }
          return { name: color, hexCode: '', images: [] };
        });
      }
    } else {
      transformedProduct.colors = [];
    }
    
    // Handle images (comma-separated URLs expected in CSV/Excel)
    if (product.images || product.Images || product.IMAGES) {
      const imagesStr = product.images || product.Images || product.IMAGES;
      try {
        // Try to parse as JSON if it's in JSON format
        transformedProduct.images = JSON.parse(imagesStr);
      } catch (e) {
        // If not JSON, try to parse as comma-separated string
        transformedProduct.images = imagesStr.split(',').map(url => url.trim());
      }
      
      // Set main image if available
      if (transformedProduct.images.length > 0) {
        transformedProduct.mainImage = transformedProduct.images[0];
      }
    } else {
      transformedProduct.images = [];
    }
    
    return transformedProduct;
  });
};

/**
 * Import products from file (CSV or Excel)
 * @param {string} filePath - Path to import file
 * @returns {Promise<Object>} - Import results
 */
exports.importProducts = async (filePath) => {
  try {
    const fileType = this.getFileType(filePath);
    
    if (fileType === 'unknown') {
      throw new Error('Unsupported file type. Please upload a CSV or Excel file.');
    }
    
    let rawProducts;
    if (fileType === 'csv') {
      rawProducts = await this.parseCSV(filePath);
    } else {
      rawProducts = this.parseExcel(filePath);
    }
    
    if (!rawProducts || rawProducts.length === 0) {
      throw new Error('No products found in the import file.');
    }
    
    const transformedProducts = this.transformProductData(rawProducts);
    
    // Import statistics
    const results = {
      total: transformedProducts.length,
      successful: 0,
      failed: 0,
      errors: []
    };
    
    // Import products
    for (const productData of transformedProducts) {
      try {
        // Check if product with same SKU already exists
        const existingProduct = await Product.findOne({ sku: productData.sku });
        
        if (existingProduct) {
          // Update existing product
          await Product.findByIdAndUpdate(existingProduct._id, productData);
        } else {
          // Create new product
          await Product.create(productData);
        }
        
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          product: productData.name || productData.sku,
          error: error.message
        });
      }
    }
    
    return results;
  } catch (error) {
    throw error;
  } finally {
    // Clean up - delete the temporary file
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error('Error deleting temporary file:', error);
    }
  }
};

/**
 * Generate a sample CSV template for product import
 * @returns {string} - CSV content
 */
exports.generateCSVTemplate = () => {
  const headers = [
    'name', 'description', 'price', 'salePrice', 'onSale', 
    'category', 'subCategory', 'brand', 'sku', 'inStock',
    'sizes', 'colors', 'material', 'careInstructions', 'sizeGuide',
    'featured', 'newArrival', 'bestSeller', 'images'
  ];
  
  const sampleRow = [
    'Summer Floral Dress',
    'A beautiful floral summer dress perfect for warm days.',
    '59.99',
    '49.99',
    'true',
    'women',
    'dresses',
    'Fashion Brand',
    'WD-12345',
    'true',
    'S:10,M:15,L:8,XL:5',
    'Blue:#0000FF,Red:#FF0000,Green:#00FF00',
    '100% Cotton',
    'Machine wash cold, tumble dry low',
    'S (0-2), M (4-6), L (8-10), XL (12-14)',
    'true',
    'true',
    'false',
    'https://example.com/image1.jpg,https://example.com/image2.jpg'
  ];
  
  return headers.join(',') + '\n' + sampleRow.join(',');
};

/**
 * Generate a sample Excel template for product import
 * @returns {Buffer} - Excel file buffer
 */
exports.generateExcelTemplate = () => {
  const headers = [
    'name', 'description', 'price', 'salePrice', 'onSale', 
    'category', 'subCategory', 'brand', 'sku', 'inStock',
    'sizes', 'colors', 'material', 'careInstructions', 'sizeGuide',
    'featured', 'newArrival', 'bestSeller', 'images'
  ];
  
  const sampleRow = [
    'Summer Floral Dress',
    'A beautiful floral summer dress perfect for warm days.',
    59.99,
    49.99,
    true,
    'women',
    'dresses',
    'Fashion Brand',
    'WD-12345',
    true,
    'S:10,M:15,L:8,XL:5',
    'Blue:#0000FF,Red:#FF0000,Green:#00FF00',
    '100% Cotton',
    'Machine wash cold, tumble dry low',
    'S (0-2), M (4-6), L (8-10), XL (12-14)',
    true,
    true,
    false,
    'https://example.com/image1.jpg,https://example.com/image2.jpg'
  ];
  
  const worksheet = xlsx.utils.aoa_to_sheet([headers, sampleRow]);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Products');
  
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};
