const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = process.env.SCOPES;
const redirectUri = `${process.env.HOST}/auth/callback`;

app.use(express.json());

// Helper function to validate HMAC
function validateHMAC(query) {
  const { hmac, ...rest } = query;
  const message = querystring.stringify(rest);
  const providedHmac = Buffer.from(hmac, 'utf-8');
  const generatedHash = Buffer.from(
    crypto
      .createHmac('sha256', apiSecret)
      .update(message)
      .digest('hex'),
      'utf-8'
  );
  let hashEquals = false;
  try {
    hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac);
    console.log('HMAC validation success');
  } catch (e) {
    console.error('HMAC validation error', e);
    hashEquals = false;
  }

  return hashEquals;
}

// Function to create an automatic discount
const createDiscount = async (shop, accessToken) => {
  console.log(`Creating discount for shop ${shop}`);
  try {
    const mutation = `mutation {
      discountAutomaticAppCreate(automaticAppDiscount: {
        title: "Messold",
        functionId: "a434cfd1-f52f-4657-9071-898522239e39",
        startsAt: "2023-11-22T00:00:00Z"
      }) {
        automaticAppDiscount {
          discountId
        }
        userErrors {
          field
          message
        }
      }
    }`;

    const response = await axios.post(`https://${shop}/admin/api/2021-01/graphql.json`, {
      query: mutation
    }, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      }
    });

    console.log('Discount creation response:', response.data);
    return response.data.data.discountAutomaticAppCreate.automaticAppDiscount.discountId;
  } catch (error) {
    console.error('Error creating discount:', error.response || error);
    throw new Error('Failed to create discount');
  }
};

// ... [existing route handlers]

// Example route to trigger discount creation
app.post('/create-discount', async (req, res) => {
  const { shop, accessToken } = req.body; // You would get these values securely, e.g., from your database or environment variables
  try {
    const discountId = await createDiscount(shop, accessToken);
    console.log(`Discount created with ID: ${discountId}`);
    res.status(200).json({ success: true, discountId: discountId });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ... [other routes and app.listen]

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
