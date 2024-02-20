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
  const calculatedHash = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET).update(rawBody, 'utf8').digest('base64');
  
  console.log('Received HMAC:', receivedHmac);
  console.log('Calculated HMAC:', calculatedHash);
  
  return receivedHmac === calculatedHash;
}

// Function to create a discount using Shopify GraphQL API
async function createDiscount(shop, accessToken) {
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

    console.log('Apps fetched:', response.data.data.apps.edges.map(edge => edge.node));
  } catch (error) {
    console.error('Error fetching apps:', error.response ? error.response.data : error.message);
  }
}

// OAuth callback endpoint for app installation
app.get('/auth/callback', async (req, res) => {
  // Implement OAuth flow here to obtain accessToken
  // const accessToken = '...';

  if (accessToken) {
    console.log('App installed successfully. Access Token:', accessToken);

    // Fetch and log the list of installed apps
    const shop = 'messoldtech.myshopify.com'; // Replace with your Shopify shop domain
    await fetchApps(shop, accessToken);

    res.send('App Installed Successfully');
  } else {
    console.error('Failed to install app. No access token received.');
    res.status(500).send('Failed to install app');
  }
});

// Webhook endpoint for cart updates
app.post('/webhooks/cart/update', async (req, res) => {
  console.log('Headers:', req.headers);
  console.log('Raw body for HMAC validation:', req.rawBody);

  if (!validateHMAC(req.headers, req.rawBody)) {
    console.error('HMAC validation failed');
    return res.status(401).send('HMAC validation failed');
  }

  console.log('Received cart update webhook:', req.body);

  const shop = 'messoldtech.myshopify.com'; // Your Shopify shop domain
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

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
