const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const AbandonedCart = require('../models/abandonedCart.model');
const Coupon = require('../models/coupon.model');

// Create a transporter object
const createTransporter = () => {
  // For production, use actual SMTP settings
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  
  // For development, use Ethereal (fake SMTP service)
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_EMAIL || 'ethereal.user@ethereal.email',
      pass: process.env.ETHEREAL_PASSWORD || 'ethereal_pass',
    },
  });
};

// Load email template
const loadTemplate = (templateName) => {
  const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
  const template = fs.readFileSync(templatePath, 'utf8');
  return handlebars.compile(template);
};

/**
 * Send abandoned cart recovery email
 * @param {Object} abandonedCartEmail - The email record from the abandoned cart
 * @param {Object} abandonedCart - The abandoned cart
 * @returns {Promise<boolean>} - Whether the email was sent successfully
 */
const sendAbandonedCartEmail = async (abandonedCartEmail, abandonedCart) => {
  try {
    // Create transporter
    const transporter = createTransporter();
    
    // Load appropriate template based on email type
    const templateName = `abandoned-cart-${abandonedCartEmail.emailType}`;
    const template = loadTemplate(templateName);
    
    // Format cart items for display
    const formattedItems = abandonedCart.cartItems.map(item => ({
      name: item.productName,
      quantity: item.quantity,
      price: item.price.toFixed(2),
      total: (item.price * item.quantity).toFixed(2),
      image: item.image
    }));
    
    // Calculate totals
    const subtotal = abandonedCart.subtotal.toFixed(2);
    const discount = abandonedCart.discountAmount ? abandonedCart.discountAmount.toFixed(2) : '0.00';
    const total = abandonedCart.total.toFixed(2);
    
    // Generate tracking pixel URL
    const trackingPixelUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/abandoned-carts/track/open/${abandonedCartEmail._id}`;
    
    // Generate recovery URL with click tracking
    const recoveryUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/abandoned-carts/track/click/${abandonedCartEmail._id}?redirectUrl=${encodeURIComponent(abandonedCart.recoveryUrl)}`;
    
    // Prepare template data
    const templateData = {
      firstName: abandonedCart.user ? abandonedCart.user.firstName : 'Valued Customer',
      items: formattedItems,
      subtotal,
      discount,
      total,
      recoveryUrl,
      trackingPixelUrl,
      storeName: process.env.STORE_NAME || 'Our Store',
      storeUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      currentYear: new Date().getFullYear()
    };
    
    // Add coupon data if this email includes a coupon
    if (abandonedCartEmail.couponCode) {
      templateData.couponCode = abandonedCartEmail.couponCode;
      templateData.discountAmount = abandonedCartEmail.discountAmount;
      
      // Get coupon details if available
      try {
        const coupon = await Coupon.findOne({ code: abandonedCartEmail.couponCode });
        if (coupon) {
          templateData.couponType = coupon.discountType;
          templateData.couponValue = coupon.discountValue;
          templateData.couponExpiry = coupon.endDate ? new Date(coupon.endDate).toLocaleDateString() : 'Never';
        }
      } catch (err) {
        console.error('Error getting coupon details:', err);
      }
    }
    
    // Render HTML
    const html = template(templateData);
    
    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'E-Commerce Store'}" <${process.env.EMAIL_FROM || 'noreply@example.com'}>`,
      to: abandonedCart.email,
      subject: abandonedCartEmail.subject,
      html,
      text: `We noticed you left some items in your cart. Visit ${abandonedCart.recoveryUrl} to complete your purchase.`,
    });
    
    console.log('Abandoned cart email sent:', info.messageId);
    
    // Update email status
    abandonedCartEmail.status = 'sent';
    abandonedCartEmail.sentAt = new Date();
    abandonedCart.lastEmailSentAt = new Date();
    await abandonedCart.save();
    
    return true;
  } catch (error) {
    console.error('Error sending abandoned cart email:', error);
    
    // Update email status to failed
    abandonedCartEmail.status = 'failed';
    await abandonedCart.save();
    
    return false;
  }
};

/**
 * Process pending abandoned cart emails
 * This function should be called by a scheduled job
 */
const processAbandonedCartEmails = async () => {
  try {
    // Find abandoned carts with pending emails
    const abandonedCarts = await AbandonedCart.find({
      status: 'active',
      'recoveryEmails.status': 'pending',
      'recoveryEmails.scheduledFor': { $lte: new Date() }
    });
    
    console.log(`Processing ${abandonedCarts.length} abandoned carts with pending emails`);
    
    for (const cart of abandonedCarts) {
      // Find pending emails that are scheduled for now or earlier
      const pendingEmails = cart.recoveryEmails.filter(
        email => email.status === 'pending' && new Date(email.scheduledFor) <= new Date()
      );
      
      for (const email of pendingEmails) {
        await sendAbandonedCartEmail(email, cart);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error processing abandoned cart emails:', error);
    return false;
  }
};

/**
 * Track email open
 * @param {string} emailId - The email ID
 * @returns {Promise<boolean>} - Whether the tracking was successful
 */
const trackEmailOpen = async (emailId) => {
  try {
    // Find the abandoned cart with this email
    const cart = await AbandonedCart.findOne({
      'recoveryEmails._id': emailId
    });
    
    if (!cart) {
      return false;
    }
    
    // Update email status
    const emailIndex = cart.recoveryEmails.findIndex(email => email._id.toString() === emailId);
    if (emailIndex !== -1) {
      cart.recoveryEmails[emailIndex].status = 'opened';
      cart.recoveryEmails[emailIndex].openedAt = new Date();
      cart.emailsOpened += 1;
      await cart.save();
    }
    
    return true;
  } catch (error) {
    console.error('Error tracking email open:', error);
    return false;
  }
};

/**
 * Track email click
 * @param {string} emailId - The email ID
 * @returns {Promise<boolean>} - Whether the tracking was successful
 */
const trackEmailClick = async (emailId) => {
  try {
    // Find the abandoned cart with this email
    const cart = await AbandonedCart.findOne({
      'recoveryEmails._id': emailId
    });
    
    if (!cart) {
      return false;
    }
    
    // Update email status
    const emailIndex = cart.recoveryEmails.findIndex(email => email._id.toString() === emailId);
    if (emailIndex !== -1) {
      cart.recoveryEmails[emailIndex].status = 'clicked';
      cart.recoveryEmails[emailIndex].clickedAt = new Date();
      cart.emailsClicked += 1;
      await cart.save();
    }
    
    return true;
  } catch (error) {
    console.error('Error tracking email click:', error);
    return false;
  }
};

module.exports = {
  sendAbandonedCartEmail,
  processAbandonedCartEmails,
  trackEmailOpen,
  trackEmailClick
};
