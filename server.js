const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
const port = 3000; // You can also use process.env.PORT to be dynamic

// Hardcoded credentials for testing purposes only
const SHOPIFY_API_KEY = 'd91da0609346c75b96a1d7e3a7b1aada';
const SHOPIFY_API_SECRET = 'eaf9811b645ec5d3fe8b137b7181c8b8';
const SHOPIFY_ACCESS_TOKEN = 'shpua_101d6de196aa3e773d897bdc3fa4b1db';

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

  console.log('Validating HMAC...');
  console.log('Received HMAC:', receivedHmac);
  console.log('Calculated HMAC:', calculatedHash);

  if (receivedHmac !== calculatedHash) {
    console.error('HMAC validation failed. The request may not be from Shopify or the secret key may be wrong.');
    return false;
  }
  return true;
}

app.post('/webhooks/cart/update', (req, res) => {
  console.log('Webhook received for cart update.');
  
  if (!validateHMAC(req.headers, req.rawBody)) {
    return res.status(401).send('Unauthorized: HMAC validation failed');
  }
  
  // Your code to handle the cart update and apply the discount
  console.log('Cart update processed successfully.');

  res.status(200).send('Webhook processed');
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
