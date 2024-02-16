require('dotenv').config();
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();
const port = process.env.PORT || 3000;

const { SHOPIFY_ACCESS_TOKEN } = process.env;

// Endpoint to list installed apps on the Shopify store
app.get('/list-installed-apps', async (req, res) => {
  const shop = req.query.shop; // Make sure to pass the shop query parameter when calling this endpoint
  const shopifyGraphqlUrl = `https://${shop}/admin/api/2022-01/graphql.json`;

  const query = `
  {
    appInstallations(first: 10) {
      edges {
        node {
          id
          appName
          app {
            id
          }
        }
      }
    }
  }
  `;

  try {
    const response = await fetch(shopifyGraphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const jsonResponse = await response.json();

    if (response.ok) {
      res.json(jsonResponse.data.appInstallations);
    } else {
      res.status(response.status).json(jsonResponse);
    }
  } catch (error) {
    console.error('Error fetching installed apps:', error);
    res.status(500).send('Error fetching installed apps');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
