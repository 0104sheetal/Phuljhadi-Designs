require('dotenv').config();
const express = require('express');
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

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const jsonResponse = await response.json();
    res.json(jsonResponse.data.appInstallations);
  } catch (error) {
    console.error('Error fetching installed apps:', error);
    res.status(500).send(`Error fetching installed apps: ${error.message}`);
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
