# Fashion E-Commerce Backend API

This is the backend API for the Fashion E-Commerce platform. It provides RESTful endpoints for managing products, orders, users, and payments.

## Technologies Used

- Node.js
- Express.js
- MongoDB with Mongoose
- Firebase Authentication
- Stripe Payment Integration
- JWT for API authentication
- Multer for file uploads

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- Firebase project with Authentication enabled
- Stripe account for payment processing

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fashion-ecommerce.git
cd fashion-ecommerce/backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```
# Server Configuration
NODE_ENV=development
PORT=5000

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/fashion_ecommerce

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Firebase Admin SDK
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=your_client_cert_url

# Stripe API Keys
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=your_email@gmail.com

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

4. Seed the database with sample products:
```bash
npm run seed
```

5. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate user & get token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/forgot-password` - Send password reset email

### Products

- `GET /api/products` - Get all products with filtering, sorting, and pagination
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/top` - Get top rated products
- `GET /api/products/new-arrivals` - Get new arrivals
- `GET /api/products/category/:category` - Get products by category
- `GET /api/products/:id/related` - Get related products
- `POST /api/products/:id/reviews` - Create product review
- `GET /api/products/:id/reviews` - Get product reviews
- `GET /api/products/search` - Search products

### Users

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/address` - Add address
- `PUT /api/users/address/:addressId` - Update address
- `DELETE /api/users/address/:addressId` - Delete address
- `PUT /api/users/address/:addressId/default` - Set default address
- `GET /api/users/wishlist` - Get wishlist
- `POST /api/users/wishlist/:productId` - Add to wishlist
- `DELETE /api/users/wishlist/:productId` - Remove from wishlist
- `GET /api/users/cart` - Get cart
- `POST /api/users/cart` - Add to cart
- `PUT /api/users/cart/:itemId` - Update cart item
- `DELETE /api/users/cart/:itemId` - Remove from cart
- `DELETE /api/users/cart` - Clear cart

### Orders

- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/pay` - Update order to paid
- `PUT /api/orders/:id/deliver` - Update order to delivered
- `GET /api/orders/myorders` - Get logged in user's orders
- `PUT /api/orders/:id/cancel` - Cancel order

### Payments

- `POST /api/payment/create-payment-intent` - Create a payment intent
- `POST /api/payment/webhook` - Handle Stripe webhook events
- `GET /api/payment/methods` - Get user's payment methods
- `POST /api/payment/methods` - Add a payment method
- `DELETE /api/payment/methods/:id` - Delete a payment method

### Admin

- `GET /api/admin/dashboard/stats` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/:id` - Get user by ID
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/products` - Create a product
- `PUT /api/admin/products/:id` - Update a product
- `DELETE /api/admin/products/:id` - Delete a product
- `POST /api/admin/products/:id/upload` - Upload product image
- `POST /api/admin/products/import` - Import products from CSV/Excel
- `GET /api/admin/products/import/template/csv` - Download CSV template
- `GET /api/admin/products/import/template/excel` - Download Excel template
- `GET /api/admin/orders` - Get all orders
- `PUT /api/admin/orders/:id/status` - Update order status

## Deployment

The API can be deployed to platforms like Render, Heroku, or any other cloud service.

1. Build the application:
```bash
npm run build
```

2. Deploy to your preferred hosting service.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
#   e c o m m e r c e - b a c k e n d 
 
 
