const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = process.env.SCOPES;
const redirectUri = `${process.env.HOST}/auth/callback`;

// Helper function to validate HMAC
function validateHMAC(query) {
  const { hmac, ...rest } = query;
  const message = querystring.stringify(rest);
  const providedHmac = Buffer.from(hmac, 'utf-8');
  const generatedHash = Buffer.from(
    crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('hex'),
      'utf-8'
  );
  let hashEquals = false;
  try {
    hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac);
    console.log('HMAC validation success');
  } catch (e) {
    console.error('HMAC validation error', e);
    hashEquals = false;
  }

  return hashEquals;
}

// Route to handle app installation
app.get('/', (req, res) => {
  console.log('Received a request at root:', req.query);
  if (req.query.shop && validateHMAC(req.query)) {
    const shop = req.query.shop;
    const state = crypto.randomBytes(16).toString('hex');
    const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;
    
    console.log('Redirecting to Shopify for OAuth:', installUrl);
    res.redirect(installUrl);
  } else {
    console.error('Missing or invalid parameters on root request');
    res.status(400).send('Required parameters missing or invalid');
  }
});

// OAuth callback route
app.get('/auth/callback', async (req, res) => {
  console.log('Received OAuth callback:', req.query);
  if (!validateHMAC(req.query)) {
    console.error('HMAC validation failed at OAuth callback');
    return res.status(400).send('HMAC validation failed');
  }

  try {
    const { shop, code } = req.query;
    const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    });

    const accessToken = tokenResponse.data.access_token;
    console.log('Access token received:', accessToken);

    // Set the access token in your environment variables (not recommended for production)
    // In a production app, you would securely store the access token
    process.env.SHOPIFY_ACCESS_TOKEN = accessToken;

    console.log('App installation successful');
    res.redirect('/success');
  } catch (error) {
    console.error('Error getting Shopify access token:', error.response || error);
    res.status(500).send('Error during OAuth callback');
  }
});

// Success route
app.get('/success', (req, res) => {
  console.log('Redirected to success page');
  res.send('The app has been successfully installed.');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
