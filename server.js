require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Discount logic functions
function calculateProductTypeCount(cartItems, productType) {
  let productTypeCount = 0;
  cartItems.forEach(item => {
    if (item.merchandise.__typename === "ProductVariant" && item.merchandise.product.productType === productType) {
      productTypeCount += item.quantity;
    }
  });
  return productTypeCount;
}

function calculateDiscount(productTypeCount, productType) {
  if (productTypeCount >= 2) {
    const remainder = productTypeCount % 3;
    const bulkCount = Math.floor(productTypeCount / 3);
    if (productType === "1500") {
      return remainder === 2 ? 300 + bulkCount * 750 : bulkCount * 750;
    } else if (productType === "1000") {
      return remainder === 2 ? 598 + bulkCount * 1097 : bulkCount * 1097;
    }
  }
  return 0;
}

// Endpoint to calculate discounts based on cart items
app.post('/calculate-discount', (req, res) => {
  console.log("Calculating discount for the cart");

  // Extract cart from request body
  const { cart } = req.body;

  // Perform discount calculation
  const productType1000Count = calculateProductTypeCount(cart.lines, "1000");
  const productType1500Count = calculateProductTypeCount(cart.lines, "1500");

  const discount1000 = calculateDiscount(productType1000Count, "1000");
  const discount1500 = calculateDiscount(productType1500Count, "1500");

  if (discount1000 === 0 && discount1500 === 0) {
    console.log("No products with the specified product types.");
    res.json({ discount: 0, message: "No discount applied" });
    return;
  }

  const discountAmount = discount1000 + discount1500;
  console.log(`Applying a discount of Rs ${discountAmount} to ${productType1000Count + productType1500Count} products.`);

  // Respond with calculated discount amount
  res.json({
    discount: discountAmount,
    message: "Discount calculated"
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
