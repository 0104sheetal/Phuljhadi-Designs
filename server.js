require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

// Shopify credentials and API secret from environment variables
const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
const shop = 'messoldtech.myshopify.com'; // Replace with your actual shop domain

app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Helper function to validate Shopify's HMAC signature
function validateHMAC(headers, rawBody) {
  const receivedHmac = headers['x-shopify-hmac-sha256'];
  const calculatedHash = crypto.createHmac('sha256', apiSecret).update(rawBody, 'utf8').digest('base64');
  
  return receivedHmac === calculatedHash;
}

// Function to create a discount using Shopify GraphQL API
async function createDiscount() {
  const mutation = `mutation {
    discountAutomaticAppCreate(automaticAppDiscount: {
      title: "Messold",
      startsAt: "2023-11-22T00:00:00Z",
      targetType: "LINE_ITEM",
      customerSelection: {
        all: {}
      },
      customerGets: {
        value: {
          percentage: 10
        },
        items: {
          all: {}
        }
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
    const response = await axios.post(`https://${shop}/admin/api/2024-01/graphql.json`, {
      query: mutation
    }, {
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

// Endpoint to handle app installation
app.get('/install', async (req, res) => {
  try {
    const discountId = await createDiscount();
    console.log(`Discount created with ID: ${discountId}`);
    res.status(200).send(`App installed and discount created with ID: ${discountId}`);
  } catch (error) {
    console.error('Failed to create discount upon installation:', error.message);
    res.status(500).send('Failed to create discount upon installation');
  }
});

// Webhook endpoint for cart updates
app.post('/webhooks/cart/update', async (req, res) => {
  if (!validateHMAC(req.headers, req.rawBody)) {
    console.error('HMAC validation failed');
    return res.status(401).send('HMAC validation failed');
  }

  console.log('Received cart update webhook:', req.body);
  res.status(200).send('Webhook received');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
