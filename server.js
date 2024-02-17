const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');

// Load environment variables from .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Replace with your app's credentials and the store's URL
const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = process.env.SCOPES;
const storeUrl = process.env.SHOP_URL; // e.g., 'your-store.myshopify.com'
const redirectUri = `${process.env.HOST}/auth/callback`;

// Route for installing the app
app.get('/install', (req, res) => {
  const installUrl = `https://${storeUrl}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}`;
  res.redirect(installUrl);
});

// Route for handling the OAuth callback
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;

  // Exchange temporary code for a permanent access token
  try {
    const tokenResponse = await axios.post(`https://${storeUrl}/admin/oauth/access_token`, {
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    });

    const accessToken = tokenResponse.data.access_token;

    // Here you would normally save the access token to your database
    // Since this app is for a single store, you can just set it in the environment
    process.env.SHOPIFY_ACCESS_TOKEN = accessToken;

    // Redirect to a confirmation page or the app dashboard
    res.redirect('/success');
  } catch (error) {
    console.error('Failed to exchange code for access token', error);
    res.status(500).send('Something went wrong during the authentication process.');
  }
});

// Route to confirm successful installation
app.get('/success', (req, res) => {
  res.send('The app has been successfully installed.');
});

// Start the server
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
