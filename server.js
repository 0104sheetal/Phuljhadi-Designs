require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SCOPES, HOST, SHOPIFY_ACCESS_TOKEN, SHOPIFY_ORDER_DISCOUNT_ID } = process.env;

// Root endpoint just to check if the app is running
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Endpoint to initiate OAuth with Shopify
app.get('/shopify', (req, res) => {
  const shop = req.query.shop;
  if (shop) {
    const redirectUri = `${HOST}/shopify/callback`;
    const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${redirectUri}`;
    res.redirect(installUrl);
  } else {
    return res.status(400).send('Missing shop parameter. Please add ?shop=your-shop-name.myshopify.com to your request');
  }
});

// OAuth callback endpoint
app.get('/shopify/callback', async (req, res) => {
  const { shop, code } = req.query;
  const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
  const accessTokenPayload = {
    client_id: SHOPIFY_API_KEY,
    client_secret: SHOPIFY_API_SECRET,
    code,
  };

  try {
    const response = await fetch(accessTokenRequestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(accessTokenPayload),
    });
    const jsonResponse = await response.json();
    console.log('Access Token:', jsonResponse.access_token);
    res.send('Access token received and stored successfully');
  } catch (error) {
    console.error('Error during access token retrieval:', error);
    res.status(500).send('Error during access token retrieval');
  }
});

// Endpoint to create an automatic discount in Shopify
app.get('/create-discount', async (req, res) => {
  const graphqlMutation = {
    query: `
      mutation {
        discountAutomaticAppCreate(automaticAppDiscount: {
          title: "Messold",
          functionId: "${SHOPIFY_ORDER_DISCOUNT_ID}",
          startsAt: "2023-11-22T00:00:00Z"
        }) {
          automaticAppDiscount {
            discountId
          }
          userErrors {
            field
            message
          }
        }
      }
    `
  };

  try {
    const shopifyResponse = await fetch(`https://${req.query.shop}/admin/api/2021-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify(graphqlMutation),
    });
    const shopifyJson = await shopifyResponse.json();
    res.json(shopifyJson);
  } catch (error) {
    console.error('Error creating discount:', error);
    res.status(500).send('Error creating discount');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
