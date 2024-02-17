const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Shopify credentials from environment variables
const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = process.env.SCOPES;
const redirectUri = `${process.env.HOST}/auth/callback`;

app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Helper function to validate Shopify's HMAC signature
function validateHMAC(headers, rawBody) {
  const hmac = headers['x-shopify-hmac-sha256'];
  const hash = crypto.createHmac('sha256', apiSecret).update(rawBody).digest('base64');
  return hash === hmac;
}

// Function to create a discount
async function createDiscount(shop, accessToken) {
  const mutation = `mutation {
    discountAutomaticAppCreate(automaticAppDiscount: {
      title: "Messold",
      startsAt: "2023-11-22T00:00:00Z"
      targetType: LINES
      customerGets: {
        value: {
          percentage: 10
        }
        items: ALL
      }
    }) {
      automaticAppDiscount {
        id
      }
      userErrors {
        field
        message
      }
    }
  }`;

  try {
    const response = await axios.post(`https://${shop}/admin/api/2021-01/graphql.json`, JSON.stringify({ query: mutation }), {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      }
    });

    console.log('Discount created:', response.data);
    return response.data.data.discountAutomaticAppCreate.automaticAppDiscount.id;
  } catch (error) {
    console.error('Error creating discount:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Add the rest of your OAuth process and other route handlers here

// Endpoint to handle cart update webhook
app.post('/webhook/cart/update', async (req, res) => {
  if (!validateHMAC(req.headers, req.rawBody)) {
    return res.status(401).send('HMAC validation failed');
  }

  console.log('Received cart update webhook:', req.body);

  // Extract shop domain and access token from the webhook request or your database
  const shop = 'messoldtech.myshopify.com'; // Replace with actual shop domain
  const accessToken = 'shpua_101d6de196aa3e773d897bdc3fa4b1db'; // Replace with actual access token retrieved from your database

  try {
    const discountId = await createDiscount(shop, accessToken);
    console.log(`Discount created with ID: ${discountId}`);
    res.status(200).send('Webhook processed and discount created');
  } catch (error) {
    res.status(500).send('Failed to create discount');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
