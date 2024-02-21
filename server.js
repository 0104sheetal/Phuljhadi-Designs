require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Middleware to capture raw body data for HMAC validation
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

// Function to register a webhook via the Shopify API
async function registerWebhook(shop, accessToken, topic, address) {
  try {
    const response = await axios.post(
      `https://${shop}/admin/api/2022-01/webhooks.json`,
      {
        webhook: {
          topic: topic,
          address: address,
          format: 'json'
        }
      },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Webhook registered:', response.data);
    return response.data.webhook;
  } catch (error) {
    console.error('Error registering webhook:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Endpoint to handle cart updates
app.post('/webhooks/cart/update', async (req, res) => {
  if (!validateHMAC(req.headers, req.rawBody)) {
    console.error('HMAC validation failed');
    return res.status(401).send('Unauthorized: HMAC validation failed');
  }

  console.log('Received cart update webhook:', req.body);
  res.status(200).send('Webhook processed');
});

// OAuth callback endpoint where you should handle the OAuth process
app.get('/auth/shopify/callback', async (req, res) => {
  // Here you would handle the OAuth process and obtain an access token
  // For the purpose of this example, we're using placeholder values
  const shop = 'your-shop.myshopify.com'; // Replace with the actual shop domain
  const accessToken = 'your-access-token'; // Replace with the actual access token obtained from the OAuth process

  // Define the topic and the endpoint that Shopify should hit for the webhook
  const webhookTopic = 'carts/update';
  const webhookAddress = `${process.env.HOST}/webhooks/cart/update`;

  // Register the webhook
  const registeredWebhook = await registerWebhook(shop, accessToken, webhookTopic, webhookAddress);

  if (registeredWebhook) {
    res.send('App installed and webhook registered.');
  } else {
    res.status(500).send('Failed to register webhook.');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
