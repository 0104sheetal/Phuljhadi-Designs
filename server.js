require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const SHOPIFY_GRAPHQL_URL = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/graphql.json`;

app.post('/apply-discount', async (req, res) => {
  const mutation = `
    mutation {
      discountAutomaticAppCreate(automaticAppDiscount: {
        title: "Messold",
        functionId: "a434cfd1-f52f-4657-9071-898522239e39",
        startsAt: "2023-11-22T00:00:00"
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
  `;

  try {
    // Dynamically import node-fetch
    const { default: fetch } = await import('node-fetch');

    const response = await fetch(SHOPIFY_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query: mutation }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const responseData = await response.json();
    if (responseData.errors) {
      throw new Error(`Error from Shopify API: ${JSON.stringify(responseData.errors)}`);
    }

    res.json(responseData.data);
  } catch (error) {
    console.error('Error applying discount:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
