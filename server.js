require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const request = require('request');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'write_discounts,read_products,write_products';
const forwardingAddress = process.env.HOST; // Replace with your ngrok or Heroku URL

app.use(bodyParser.json());

// Route for installing the app
app.get('/shopify', (req, res) => {
    const shop = req.query.shop;
    if (shop) {
        const state = crypto.randomBytes(16).toString('hex');
        const redirectUri = forwardingAddress + '/shopify/callback';
        const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;

        res.cookie('state', state);
        res.redirect(installUrl);
    } else {
        return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
    }
});

// Route for OAuth callback
app.get('/shopify/callback', (req, res) => {
    const { shop, hmac, code, state } = req.query;
    const stateCookie = req.cookies.state;

    if (state !== stateCookie) {
        return res.status(403).send('Request origin cannot be verified');
    }

    // Request for permanent access token
    const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
    const accessTokenPayload = {
        client_id: apiKey,
        client_secret: apiSecret,
        code,
    };

    request.post(accessTokenRequestUrl, { json: accessTokenPayload }, (error, response, body) => {
        if (error) {
            return res.status(500).send(`Error getting OAuth access token: ${error}`);
        }

        const accessToken = body.access_token;
        // Use access token to make API call to 'shop' endpoint
        res.status(200).end('App installed');
    });
});

// Webhook endpoint for cart updates
app.post('/webhook/cart-update', (req, res) => {
    // Verify webhook authenticity
    // Apply discount logic
    // Respond to Shopify
    res.status(200).send('Webhook processed');
});

// Start the server
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
