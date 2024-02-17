require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Helper function to validate Shopify's HMAC signature
function validateHMAC(headers, rawBody) {
  const hmac = headers['x-shopify-hmac-sha256'];
  const hash = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET).update(rawBody).digest('base64');
  return hmac === hash; // This line was updated to match the order of comparison
}

// Function to create a discount using Shopify GraphQL API
async function createDiscount(shop, accessToken) {
  const mutation = `
    mutation discountAutomaticAppCreate($input: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(input: $input) {
        automaticAppDiscount {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      title: "Messold",
      startsAt: "2023-11-22T00:00:00Z",
      targetType: "LINE_ITEM",
      customerSelection: {
        all: {}
      },
      customerGets: {
        value: {
          percentage: 10
        },
        items: {
          all: {}
        }
      }
    }
  };

  try {
    const response = await axios.post(`https://${shop}/admin/api/2021-01/graphql.json`, {
      query: mutation,
      variables: variables
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      }
    });

    console.log('Discount created:', response.data);
    return response.data.data.discountAutomaticAppCreate.automaticAppDiscount.id;
  } catch (error) {
    console.error('Error creating discount:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Webhook endpoint for cart updates
app.post('/webhooks/cart/update', async (req, res) => {
  if (!validateHMAC(req.headers, req.rawBody)) {
    console.error('HMAC validation failed');
    return res.status(401).send('HMAC validation failed');
  }

  console.log('Received cart update webhook:', req.body);

  // Use your shop domain and access token from environment variables
  const shop = 'messoldtech.myshopify.com'; // Your Shopify shop domain
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN; // Access token for your Shopify app

  try {
    const discountId = await createDiscount(shop, accessToken);
    console.log(`Discount created with ID: ${discountId}`);
    res.status(200).send(`Webhook processed and discount created with ID: ${discountId}`);
  } catch (error) {
    console.error('Failed to create discount:', error.message);
    res.status(500).send('Failed to create discount');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
