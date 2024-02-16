require('dotenv').config();
const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();
const port = process.env.PORT || 3000;

const { SHOPIFY_ACCESS_TOKEN } = process.env;

// ...

// Endpoint to create a 10% off discount code
app.get('/create-discount-code', async (req, res) => {
  const shop = req.query.shop;
  const shopifyAdminUrl = `https://${shop}/admin/api/2022-01/`;

  // Define payload for the price rule
  const priceRulePayload = {
    price_rule: {
      title: '10% Off Cart',
      target_type: 'line_item',
      target_selection: 'all',
      allocation_method: 'across',
      value_type: 'percentage',
      value: '-10.0',
      customer_selection: 'all',
      starts_at: new Date().toISOString(),
    }
  };

  try {
    // Create a price rule
    const priceRuleResponse = await fetch(`${shopifyAdminUrl}price_rules.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify(priceRulePayload),
    });

    const priceRuleJson = await priceRuleResponse.json();
    if (!priceRuleResponse.ok) {
      throw new Error(`HTTP error! status: ${priceRuleResponse.status}`);
    }

    // Use the created price rule ID to create a discount code
    const discountCode = `10OFF-${Date.now()}`; // Generate a unique code
    const discountCodePayload = {
      discount_code: {
        code: discountCode
      }
    };

    const discountCodeResponse = await fetch(`${shopifyAdminUrl}price_rules/${priceRuleJson.price_rule.id}/discount_codes.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify(discountCodePayload),
    });

    const discountCodeJson = await discountCodeResponse.json();
    if (!discountCodeResponse.ok) {
      throw new Error(`HTTP error! status: ${discountCodeResponse.status}`);
    }

    res.json({
      price_rule: priceRuleJson.price_rule,
      discount_code: discountCodeJson.discount_code
    });
  } catch (error) {
    console.error('Error creating discount code:', error);
    res.status(500).send(`Error creating discount code: ${error.message}`);
  }
});

// ...

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
