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

// OAuth callback endpoint for app installation
app.get('/auth/callback', async (req, res) => {
  // Handle the authentication process here
  // ...

  if (accessToken) {
    console.log('App installed successfully. Access Token:', accessToken);
    res.send('App Installed Successfully');
  } else {
    console.error('Failed to install app. No access token received.');
    res.status(500).send('Failed to install app');
  }
});

// Helper function to validate Shopify's HMAC signature
function validateHMAC(headers, rawBody) {
  const receivedHmac = headers['x-shopify-hmac-sha256'];
  const calculatedHash = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET).update(rawBody, 'utf8').digest('base64');
  
  return receivedHmac === calculatedHash;
}

// Function to create a discount using Shopify GraphQL API
async function createDiscount(shop, accessToken) {
  const mutation = `mutation { ... }`; // Your GraphQL mutation here

  try {
    const response = await axios.post(`https://${shop}/admin/api/2021-01/graphql.json`, {
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

// Function to fetch app details using Shopify GraphQL API
async function fetchApps(shop, accessToken) {
  const query = `
    {
      apps(first: 10) {
        edges {
          node {
            id
            title
            appType
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(`https://${shop}/admin/api/2021-01/graphql.json`, {
      query: query
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      }
    });

    console.log('Apps fetched:', response.data);
    return response.data.data.apps.edges;
  } catch (error) {
    console.error('Error fetching apps:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Webhook endpoint for cart updates
app.post('/webhooks/cart/update', async (req, res) => {
  if (!validateHMAC(req.headers, req.rawBody)) {
    console.error('HMAC validation failed');
    return res.status(401).send('HMAC validation failed');
  }

  console.log('Received cart update webhook:', req.body);

  const shop = 'yourshop.myshopify.com'; // Replace with your Shopify shop domain
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN; // Access token for your Shopify app

  try {
    const discountId = await createDiscount(shop, accessToken);
    console.log(`Discount created with ID: ${discountId}`);
    res.status(200).send(`Webhook processed and discount created with ID: ${discountId}`);
  } catch (error) {
    console.error('Failed to create discount:', error.message);
    res.status(500).send('Failed to create discount');
  }
});

// Route to fetch app details
app.get('/fetch-apps', async (req, res) => {
  const shop = 'yourshop.myshopify.com'; // Replace with your Shopify shop domain
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN; // Access token for your Shopify app

  try {
    const apps = await fetchApps(shop, accessToken);
    res.status(200).json(apps);
  } catch (error) {
    console.error('Error while fetching apps:', error.message);
    res.status(500).send('Error fetching apps');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
