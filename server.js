require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SCOPES, HOST } = process.env;

// In-memory storage for the access token
let accessToken = '';

app.get('/shopify', (req, res) => {
  const shop = req.query.shop;
  if (shop) {
    const redirectUri = `${HOST}/shopify/callback`;
    const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${SCOPES}&redirect_uri=${redirectUri}`;

    console.log('Redirecting to Shopify for authentication:', installUrl);
    res.redirect(installUrl);
  } else {
    console.log('Shop parameter is missing in the request');
    return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
  }
});

app.get('/shopify/callback', async (req, res) => {
  const { shop, code } = req.query;
  const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
  const accessTokenPayload = {
    client_id: SHOPIFY_API_KEY,
    client_secret: SHOPIFY_API_SECRET,
    code,
  };

  try {
    console.log('Requesting access token from Shopify...');
    const response = await fetch(accessTokenRequestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(accessTokenPayload),
    });

    const jsonResponse = await response.json();
    accessToken = jsonResponse.access_token;
    console.log('Access Token:', accessToken);

    // Here the access token is stored in the accessToken variable.
    // Note: This token should be secured, and this approach is not recommended for production.
    res.status(200).send('Access token stored in memory');
  } catch (error) {
    console.error('Error during access token retrieval:', error);
    res.status(500).send('Error during access token retrieval');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
