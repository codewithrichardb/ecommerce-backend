require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('../models/product.model');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Read additional products data
const additionalProducts = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../data/additional-products.json'), 'utf-8')
);

// Add products function
const addMoreProducts = async () => {
  try {
    console.log(`Adding ${additionalProducts.length} more products to the database...`);

    // Insert additional products
    const result = await Product.insertMany(additionalProducts);
    console.log(`Successfully added ${result.length} more products`);

    // Log product details
    result.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (${product.category}/${product.subCategory}) - $${product.price}`);
    });

    console.log('Additional products added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error adding products:', error);
    process.exit(1);
  }
};

// Run the function
addMoreProducts();
