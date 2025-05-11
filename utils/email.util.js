const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * Send email using nodemailer
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.message - Email message (plain text)
 * @param {string} options.html - Email HTML content (optional)
 * @returns {Promise} - Nodemailer send result
 */
exports.sendEmail = async (options) => {
  // Create transporter
  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // e.g., 'gmail', 'sendgrid'
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // Define email options
  const mailOptions = {
    from: `Fashion Store <${process.env.EMAIL_FROM}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  // Send email
  return await transporter.sendMail(mailOptions);
};

/**
 * Send welcome email to new user
 * @param {Object} user - User object
 * @param {string} user.email - User email
 * @param {string} user.firstName - User first name
 * @returns {Promise} - Email send result
 */
exports.sendWelcomeEmail = async (user) => {
  const subject = 'Welcome to Fashion Store!';
  const message = `Hi ${user.firstName},\n\nWelcome to Fashion Store! We're excited to have you on board.\n\nStart exploring our latest collections and find your perfect style.\n\nBest regards,\nThe Fashion Store Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3a5a78;">Welcome to Fashion Store!</h2>
      <p>Hi ${user.firstName},</p>
      <p>Welcome to Fashion Store! We're excited to have you on board.</p>
      <p>Start exploring our latest collections and find your perfect style.</p>
      <div style="margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/products" style="background-color: #3a5a78; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Start Shopping
        </a>
      </div>
      <p>Best regards,<br>The Fashion Store Team</p>
    </div>
  `;
  
  return await this.sendEmail({
    email: user.email,
    subject,
    message,
    html
  });
};

/**
 * Send order confirmation email
 * @param {Object} order - Order object
 * @param {Object} user - User object
 * @returns {Promise} - Email send result
 */
exports.sendOrderConfirmationEmail = async (order, user) => {
  const subject = `Order Confirmation #${order.id}`;
  const message = `Hi ${user.firstName},\n\nThank you for your order! We've received your order #${order.id} and are processing it now.\n\nYou can track your order status in your account.\n\nBest regards,\nThe Fashion Store Team`;
  
  // Build HTML for order items
  let itemsHtml = '';
  order.items.forEach(item => {
    itemsHtml += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.size} / ${item.color}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
      </tr>
    `;
  });
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3a5a78;">Order Confirmation</h2>
      <p>Hi ${user.firstName},</p>
      <p>Thank you for your order! We've received your order #${order.id} and are processing it now.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <h3 style="margin-top: 0;">Order Summary</h3>
        <p><strong>Order ID:</strong> #${order.id}</p>
        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p><strong>Order Status:</strong> ${order.status}</p>
        
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #eee;">
              <th style="padding: 10px; text-align: left;">Product</th>
              <th style="padding: 10px; text-align: left;">Variant</th>
              <th style="padding: 10px; text-align: left;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
              <td style="padding: 10px; text-align: right;">$${order.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right;"><strong>Shipping:</strong></td>
              <td style="padding: 10px; text-align: right;">$${order.shipping.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right;"><strong>Tax:</strong></td>
              <td style="padding: 10px; text-align: right;">$${order.tax.toFixed(2)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
              <td style="padding: 10px; text-align: right; font-weight: bold;">$${order.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <div style="margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/account/orders/${order.id}" style="background-color: #3a5a78; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          View Order Details
        </a>
      </div>
      
      <p>Best regards,<br>The Fashion Store Team</p>
    </div>
  `;
  
  return await this.sendEmail({
    email: user.email,
    subject,
    message,
    html
  });
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {string} resetToken - Password reset token
 * @returns {Promise} - Email send result
 */
exports.sendPasswordResetEmail = async (email, resetToken) => {
  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const subject = 'Password Reset Request';
  const message = `You requested a password reset. Please go to this link to reset your password: ${resetURL}\n\nIf you didn't request this, please ignore this email.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3a5a78;">Password Reset Request</h2>
      <p>You requested a password reset. Please click the button below to reset your password:</p>
      <div style="margin: 30px 0;">
        <a href="${resetURL}" style="background-color: #3a5a78; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
      </div>
      <p>If you didn't request this, please ignore this email.</p>
      <p>This link is valid for 30 minutes.</p>
      <p>Best regards,<br>The Fashion Store Team</p>
    </div>
  `;
  
  return await this.sendEmail({
    email,
    subject,
    message,
    html
  });
};
