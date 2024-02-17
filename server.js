require('dotenv').config();
const { Shopify, ApiVersion } = require('@shopify/shopify-api');
const express = require('express');
const app = express();

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  SHOPIFY_ORDER_DISCOUNT_ID,
  SCOPES,
  HOST
} = process.env;

Shopify.Context.initialize({
  API_KEY: SHOPIFY_API_KEY,
  API_SECRET_KEY: SHOPIFY_API_SECRET,
  SCOPES: SCOPES.split(','),
  HOST_NAME: HOST.replace(/https:\/\//, ""),
  API_VERSION: ApiVersion.October21, // Adjust API version as needed
  IS_EMBEDDED_APP: true,
  // other options...
});

// Handle app installation
app.get('/install', async (req, res) => {
  const { shop } = req.query;
  const authRoute = await Shopify.Auth.beginAuth(
    req, res, shop, '/auth/callback', true,
  );
  return res.redirect(authRoute);
});

// Handle post-installation auth callback
app.get('/auth/callback', async (req, res) => {
  try {
    const session = await Shopify.Auth.validateAuthCallback(req, res, req.query);
    const { accessToken, shop } = session;

    // Register the discount functionality with the shop
    const registrationResult = await registerDiscountFunction(shop, accessToken, SHOPIFY_ORDER_DISCOUNT_ID);

    if (registrationResult.success) {
      // The app is installed and the discount functionality is registered
      res.redirect(`https://${shop}/admin/apps`);
    } else {
      // Handle errors
      console.error(registrationResult.error);
      res.status(500).send('Error registering discount functionality');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Auth callback error');
  }
});

// Function to register discount functionality
async function registerDiscountFunction(shop, accessToken, functionId) {
  const client = new Shopify.Clients.Graphql(shop, accessToken);

  const mutation = `mutation {
    discountAutomaticAppCreate(automaticAppDiscount: {
      title: "Messold",
      functionId: "${functionId}",
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
  }`;

  try {
    const response = await client.query({
      data: mutation
    });

    if (response.body.data.discountAutomaticAppCreate.userErrors.length > 0) {
      return { success: false, error: response.body.data.discountAutomaticAppCreate.userErrors };
    } else {
      return { success: true, discountId: response.body.data.discountAutomaticAppCreate.automaticAppDiscount.discountId };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

app.get('/', (req, res) => {
  res.send('Hello World!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});