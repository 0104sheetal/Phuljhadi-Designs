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
function validateWebhookHMAC(req) {
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  const generatedHash = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(req.rawBody)
    .digest('base64');
  return hmacHeader === generatedHash;
}

// Function to create a discount using Shopify's GraphQL API
async function createDiscount(shop, accessToken) {
  const graphqlURL = `https://${shop}/admin/api/2021-01/graphql.json`;

  const mutation = `mutation discountAutomaticAppCreate($automaticAppDiscount: AutomaticAppDiscountInput!) {
    discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
      automaticAppDiscount {
        id
      }
      userErrors {
        field
        message
      }
    }
  }`;

  const variables = {
    automaticAppDiscount: {
      title: "Messold",
      startsAt: new Date().toISOString(),
      targetType: "LINE_ITEM",
      customerGets: {
        items: {
          all: true,
        },
        value: {
          percentage: 10
        }
      }
    }
  };

  const headers = {
    'X-Shopify-Access-Token': accessToken,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.post(graphqlURL, JSON.stringify({ query: mutation, variables: variables }), { headers: headers });
    console.log('Discount created:', response.data);
    return response.data.data.discountAutomaticAppCreate.automaticAppDiscount.id;
  } catch (error) {
    console.error('Error creating discount:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Endpoint to handle webhooks
app.post('/webhook/cart/update', async (req, res) => {
  if (!validateWebhookHMAC(req)) {
    console.error('Failed webhook HMAC validation');
    return res.status(401).end('Webhook HMAC validation failed');
  }

  console.log('Received cart update webhook:', req.body);

  // Implement your logic to determine when to create a discount.
  // For example, you can check the cart's total price and decide if a discount should be applied.
  // For now, let's assume we always want to create a discount when this webhook is called.

  try {
    const discountId = await createDiscount(req.body.shop_domain, process.env.SHOPIFY_ACCESS_TOKEN);
    console.log(`Discount created with ID: ${discountId}`);
    res.status(200).send('Webhook processed and discount created');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
