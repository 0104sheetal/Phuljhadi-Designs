require('dotenv').config();
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();
const port = process.env.PORT || 3000;

const { SHOPIFY_ACCESS_TOKEN } = process.env;

app.get('/list-installed-apps', async (req, res) => {
  const shop = req.query.shop;
  const shopifyGraphqlUrl = `https://${shop}/admin/api/2022-01/graphql.json`;

  const graphqlQuery = JSON.stringify({
    query: `{
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
    }`
  });

  try {
    const response = await fetch(shopifyGraphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: graphqlQuery,
    });

    const jsonResponse = await response.json();
    if (response.ok) {
      res.json(jsonResponse.data.appInstallations);
    } else {
      console.error('Shopify response error:', jsonResponse);
      res.status(response.status).json(jsonResponse);
    }
  } catch (error) {
    console.error('Error fetching installed apps:', error);
    res.status(500).send(`Error fetching installed apps: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
