require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/auth/callback', async (req, res) => {
    const { shop, code } = req.query;

    if (!shop || !code) {
        console.error('Missing parameters: shop or code');
        return res.status(400).send('Required parameters missing');
    }

    try {
        const fetch = await import('node-fetch');

        const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
        const accessTokenPayload = {
            client_id: process.env.SHOPIFY_API_KEY,
            client_secret: process.env.SHOPIFY_API_SECRET,
            code,
        };

        const tokenResponse = await fetch.default(accessTokenRequestUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(accessTokenPayload),
        });

        const tokenData = await tokenResponse.json();

        if (tokenResponse.ok) {
            const accessToken = tokenData.access_token;

            // Log the access token
            console.log(`Access token for shop ${shop}: ${accessToken}`);

            // Redirect to a success page or the app dashboard
            res.redirect('/');
        } else {
            console.error(`Failed to get an access token: ${tokenData.error_description || 'Unknown error'}`);
            throw new Error(`Failed to get an access token: ${tokenData.error_description || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Access token error:', error);
        res.status(500).send('Error during Shopify Authentication');
    }
});

// Home route for the server
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
