const multer = require('multer');
const path = require('path');
const fs = require('fs');
const importUtil = require('../utils/import.util');

// Configure multer storage for import files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/imports');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'import-' + uniqueSuffix + extension);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const extension = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

/**
 * Upload and import products from CSV or Excel file
 * @route POST /api/admin/products/import
 * @access Private/Admin
 */
exports.importProducts = (req, res) => {
  const uploadMiddleware = upload.single('file');
  
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ message: err.message });
    }
    
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }
    
    try {
      const results = await importUtil.importProducts(req.file.path);
      
      res.status(200).json({
        message: 'Products imported successfully',
        results
      });
    } catch (error) {
      console.error('Error importing products:', error);
      res.status(500).json({ message: error.message });
    }
  });
};

/**
 * Download CSV template for product import
 * @route GET /api/admin/products/import/template/csv
 * @access Private/Admin
 */
exports.downloadCSVTemplate = (req, res) => {
  try {
    const csvContent = importUtil.generateCSVTemplate();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.csv');
    
    res.send(csvContent);
  } catch (error) {
    console.error('Error generating CSV template:', error);
    res.status(500).json({ message: 'Error generating CSV template' });
  }
};

/**
 * Download Excel template for product import
 * @route GET /api/admin/products/import/template/excel
 * @access Private/Admin
 */
exports.downloadExcelTemplate = (req, res) => {
  try {
    const excelBuffer = importUtil.generateExcelTemplate();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.xlsx');
    
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error generating Excel template:', error);
    res.status(500).json({ message: 'Error generating Excel template' });
  }
};
