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

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.path}`);
  next();
});

// Helper function to validate Shopify's HMAC signature
function validateHMAC(headers, rawBody) {
  const receivedHmac = headers['x-shopify-hmac-sha256'];
  const calculatedHash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(rawBody, 'utf8')
    .digest('base64');

  console.log('Validating HMAC...');
  console.log('Received HMAC:', receivedHmac);
  console.log('Calculated HMAC:', calculatedHash);

  return receivedHmac === calculatedHash;
}

// Function to create a fixed amount discount using Shopify GraphQL API
async function createFixedDiscount(shop, accessToken) {
  const mutation = `
    mutation discountFixedAmountCreate($discount: DiscountFixedAmountInput!) {
      discountFixedAmountCreate(fixedAmountDiscount: $discount) {
        fixedAmountDiscount {
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
      title: "Fixed ₹100 Off",
      startsAt: new Date().toISOString(),
      endsAt: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
      appliesOncePerCustomer: true,
      customerSelection: {
        all: {}
      },
      value: {
        amount: 100.00,
        currencyCode: "INR"
      },
      targetType: "LINE_ITEM",
      allocationMethod: "ACROSS",
      usageLimit: 1,
    }
  };

  try {
    console.log('Creating fixed discount...');
    const response = await axios.post(`https://${shop}/admin/api/2021-01/graphql.json`, {
      query: mutation,
      variables: variables
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      }
    });

    console.log('Fixed discount created:', response.data);
    return response.data.data.discountFixedAmountCreate.fixedAmountDiscount.id;
  } catch (error) {
    console.error('Error creating fixed discount:', error.response ? error.response.data : error.message);
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
    console.log('Fetching apps...');
    const response = await axios.post(`https://${shop}/admin/api/2021-01/graphql.json`, {
      query: query
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      }
    });

    const appsData = response.data.data.apps.edges.map(edge => edge.node);
    console.log('Apps fetched:', appsData);
    return appsData;
  } catch (error) {
    console.error('Error fetching apps:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// OAuth callback endpoint for app installation
app.get('/auth/callback', async (req, res) => {
  console.log('Handling OAuth callback...');
  const { code, shop } = req.query;

  try {
    console.log('Exchanging code for access token...');
    const accessTokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    });

    const accessToken = accessTokenResponse.data.access_token;
    console.log('Access token obtained:', accessToken);

    console.log('Fetching and logging installed apps...');
    await fetchApps(shop, accessToken);

    console.log('Redirecting to the Shopify admin apps page...');
    res.redirect(`https://${shop}/admin/apps`);
  } catch (error) {
    console.error('Error during OAuth callback:', error.response ? error.response.data : error.message);
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