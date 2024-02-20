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

// Function to create a discount using Shopify GraphQL API
async function createDiscount(shop, accessToken) {
  const mutation = `
    mutation discountAutomaticAppCreate($discount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $discount) {
        automaticAppDiscount {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    discount: {
      title: "10% Off Everything",
      startsAt: new Date().toISOString(),
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
    }
  };

  try {
    const response = await axios.post(`https://${shop}/admin/api/2021-01/graphql.json`, {
      query: mutation,
      variables: variables
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
    return response.data.data.apps.edges.map(edge => edge.node);
  } catch (error) {
    console.error('Error fetching apps:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// OAuth callback endpoint for app installation
app.get('/auth/callback', async (req, res) => {
  const { code, shop } = req.query;

  try {
    const accessTokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    });

    const accessToken = accessTokenResponse.data.access_token;
    console.log('Access token obtained:', accessToken);

    // Fetch and log the list of installed apps using the access token
    const apps = await fetchApps(shop, accessToken);
    console.log('Installed apps:', apps);

    res.redirect(`https://${shop}/admin/apps`);
  } catch (error) {
    console.error('Error during OAuth callback:', error.response.data);
    res.status(500).send('Error during app installation');
  }
});

// Webhook endpoint for cart updates
app.post('/webhooks/cart/update', async (req, res) => {
  if (!validateHMAC(req.headers, req.rawBody)) {
    console.error('HMAC validation failed');
    return res.status(401).send('HMAC validation failed');
  }

  const shop = req.headers['x-shopify-shop-domain'];
  // Retrieve the access token for the shop from your storage
  // Here it's assumed that you've set the access token as an environment variable
  // This is NOT recommended for production; you should use a secure storage mechanism
  const accessToken = process.env[`SHOPIFY_ACCESS_TOKEN_${shop}`];

  try {
    const discountId = await createDiscount(shop, accessToken);
    console.log(`Discount created with ID: ${discountId}`);
    res.status(200).send(`Webhook processed and discount created with ID: ${discountId}`);
  } catch (error) {
    console.error('Failed to create discount:', error.response.data);
    res.status(500).send('Failed to create discount');
  }
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
