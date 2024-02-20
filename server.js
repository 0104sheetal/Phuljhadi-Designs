const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');

// Hardcoded credentials for testing purposes only
const SHOPIFY_API_KEY = 'd91da0609346c75b96a1d7e3a7b1aada';
const SHOPIFY_API_SECRET = 'eaf9811b645ec5d3fe8b137b7181c8b8';
const HOST = 'https://phuljhadi-designs-4f197fde2514.herokuapp.com';
const SHOPIFY_ACCESS_TOKEN = 'shpua_101d6de196aa3e773d897bdc3fa4b1db';
const SHOPIFY_ORDER_DISCOUNT_ID = 'a434cfd1-f52f-4657-9071-898522239e39';

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
    .createHmac('sha256', SHOPIFY_API_SECRET)
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

// Webhook endpoint for cart updates
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
    discounted_price: (item.price * 0.9).toFixed(2), // Apply a 10% discount
  }));

  console.log('Discounted cart items:', discountedCartItems);
  res.status(200).send('Cart update processed with discount applied.');
});

// Root route for a simple response
app.get('/', (req, res) => {
res.send('Hello World! Your Shopify app is running.');
});

// Start the server
app.listen(port, () => {
console.log("Server is running on port ${port}");
});
