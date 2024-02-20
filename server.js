require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Helper function to validate Shopify's HMAC signature
function validateHMAC(headers, rawBody) {
  const receivedHmac = headers['x-shopify-hmac-sha256'];
  const calculatedHash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');

  console.log('Received HMAC:', receivedHmac);
  console.log('Calculated HMAC:', calculatedHash);

  return receivedHmac === calculatedHash;
}

// OAuth callback endpoint for app installation
app.get('/auth/callback', (req, res) => {
  console.log('App installation successful.');
  // Here you would typically handle the OAuth process, but for simplicity, we'll just log
  res.send('App installation successful.');
});

// Simplified webhook endpoint for cart updates to apply a 10% discount
app.post('/webhooks/cart/update', async (req, res) => {
  if (!validateHMAC(req.headers, req.rawBody)) {
    console.error('HMAC validation failed');
    return res.status(401).send('HMAC validation failed');
  }

  console.log('Received cart update webhook:', req.body);

  // Simulate applying a 10% discount and log the result
  const cartItems = req.body.line_items;
  const discountedCartItems = cartItems.map(item => ({
    ...item,
    discounted_price: item.price * 0.9, // Apply 10% discount
  }));

  console.log('Discounted cart items:', discountedCartItems);
  res.status(200).send('Cart update processed with discount applied.');
});

// Root route for a simple response
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
