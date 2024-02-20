const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const sanitize = require('sanitize-html'); // Additional dependency for input sanitization
const helmet = require('helmet'); // For additional security measures

const app = express();
const port = process.env.PORT || 3000;

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const YOUR_SHOP_DOMAIN = process.env.YOUR_SHOP_DOMAIN; // Your Shopify shop domain

// Improved HMAC validation function
function validateHMAC(headers, rawBody) {
  const receivedHmac = headers['x-shopify-hmac-sha256'];
  const calculatedHash = crypto.createHmac('sha256', SHOPIFY_API_SECRET).update(rawBody, 'utf8').digest('base64');

  console.log('Received HMAC:', receivedHmac);
  console.log('Calculated HMAC:', calculatedHash);

  return receivedHmac === calculatedHash;
}

// Helper function to create a discount using GraphQL
async function createDiscount(shop, accessToken, cart) {
  // Sanitize input data to prevent potential vulnerabilities
  const sanitizedCart = {
    lines: cart.lines.map(line => ({
      id: sanitize(line.id),
      quantity: sanitize(line.quantity),
      merchandise: {
        __typename: sanitize(line.merchandise.__typename),
        // ...sanitize other merchandise properties if needed
      },
    })),
  };

  const mutation = `mutation {
    discountAutomaticAppCreate(automaticAppDiscount: {
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
      },
      // Add conditional targeting based on your discount logic and cart data if needed
    }) {
      automaticAppDiscount {
        id
      }
      userErrors {
        field
        message
      }
    }
  }`;

  try {
    console.log('Sending GraphQL request to create discount...');
    const response = await axios.post(`https://${shop}/admin/api/2021-01/graphql.json`, {
      query: mutation
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
    throw error; // Re-throw for proper error handling
  }
}

// Improved webhook handling with error handling and logging
app.post('/webhooks/cart/update', async (req, res) => {
  try {
    console.log('Received cart update webhook...');

    // Validate HMAC
    if (!validateHMAC(req.headers, req.rawBody)) {
      throw new Error('Invalid HMAC signature');
    }

    // Parse and sanitize JSON body
    const cart = JSON.parse(req.rawBody);
    const sanitizedCart = sanitize(cart); // Sanitize entire cart object

    // Create discount with error handling and logging
    const discountId = await createDiscount(YOUR_SHOP_DOMAIN, SHOPIFY_ACCESS_TOKEN, sanitizedCart);

    console.log(`Discount created successfully with ID: ${discountId}`);
    res.status(200).send(`Discount created with ID: ${discountId}`);
  } catch (error) {
    console.error('Error processing webhook:', error.message);
    res.status(500).send('Error processing webhook');
  }
});

// Apply basic security measures with helmet
app.use(helmet());

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log('Server is running')
} )
