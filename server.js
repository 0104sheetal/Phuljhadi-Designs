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
  // Hardcoded shared secret for testing purposes only
  const sharedSecret = 'eaf9811b645ec5d3fe8b137b7181c8b8';
  const calculatedHash = crypto
    .createHmac('sha256', sharedSecret)
    .update(rawBody, 'utf8')
    .digest('base64');

  console.log('Received HMAC:', receivedHmac);
  console.log('Calculated HMAC:', calculatedHash);

  // For troubleshooting, you might want to compare the calculated HMAC to an expected value.
  // This is only for testing and should not be in production code.
  const expectedHmac = 'Hardcoded HMAC for comparison';
  console.log('Expected HMAC:', expectedHmac);

  return receivedHmac === calculatedHash;
}

app.post('/webhooks/cart/update', (req, res) => {
  console.log('Webhook received for cart update.');

  if (!validateHMAC(req.headers, req.rawBody)) {
    console.error('HMAC validation failed');
    return res.status(401).send('Unauthorized: HMAC validation failed');
  }

  console.log('HMAC validated successfully. Processing webhook data.');
  res.status(200).send('Webhook processed');
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
