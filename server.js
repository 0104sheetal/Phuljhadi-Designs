require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

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

// Endpoint to initiate the webhook registration process
// This endpoint should be called manually after app installation
app.get('/register-webhook', async (req, res) => {
  const shop = 'myshop.myshopify.com'; // Replace with your shop domain
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN; // Replace with your access token
  const topic = 'carts/update';
  const address = `${process.env.HOST}/webhooks/cart/update`; // Your webhook endpoint URL

  const webhook = await registerWebhook(shop, accessToken, topic, address);
  if (webhook) {
    res.status(200).json({ success: true, data: webhook });
  } else {
    res.status(500).json({ success: false, message: 'Failed to register webhook' });
  }
});

// Your webhook endpoint
app.post('/webhooks/cart/update', (req, res) => {
  console.log('Received cart update webhook:', req.body);
  // Process the webhook data here
  res.status(200).send('Webhook received');
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
