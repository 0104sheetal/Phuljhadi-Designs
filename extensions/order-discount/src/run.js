// @ts-check
// import { DiscountApplicationStrategy } from "../generated/api";
// const { DiscountApplicationStrategy } = require("../generated/api.ts");
import { DiscountApplicationStrategy } from "../generated/api.ts";
// import {RunInput, FunctionRunResult, Target, ProductVariant } from "../generated/api";
/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */

// const EMPTY_DISCOUNT: FunctionRunResult = {
//   discountApplicationStrategy: DiscountApplicationStrategy.First,
//   discounts: [],
// };

// @type Configuration = {};

console.error("Running");
function run(input) {
  console.error("Starting discount calculation...");

  const productType1000Count = calculateProductTypeCount(input.cart.lines, "1000");
  const productType1500Count = calculateProductTypeCount(input.cart.lines, "1500");

  const discount1000 = calculateDiscount(productType1000Count, "1000");
  const discount1500 = calculateDiscount(productType1500Count, "1500");

  if (discount1000 === 0 && discount1500 === 0) {
    console.log("No products with the specified product types.");
    return EMPTY_DISCOUNT;
  }

  console.log(`Applying a discount of Rs ${discount1000 + discount1500} to ${productType1000Count + productType1500Count} products.`);

  const targets = input.cart.lines
    .filter(line => {
      if (line.merchandise.__typename === "ProductVariant") {
        const productType = line.merchandise.product.productType;
        return productType === "1000" || productType === "1500";
      }
      return false;
    })
    .map(line => ({
      productVariant: {
        id: line.merchandise.id,
      },
    }));

  const DISCOUNTED_ITEMS = {
    discountApplicationStrategy: "FIRST", // Assuming "FIRST" is a valid value; replace with actual value needed.
    discounts: [
      {
        targets: targets,
        value: {
          fixedAmount: {
            amount: discount1000 + discount1500
          },
        },
        message: "MESSOLD",
      },
    ],
  };

  console.log("Discount calculation complete.");
  return DISCOUNTED_ITEMS;
}

function calculateProductTypeCount(cartItems, productType) {
  let productTypeCount = 0;

  for (const item of cartItems) {
    if (item.merchandise.__typename === "ProductVariant" && item.merchandise.product.productType === productType) {
      productTypeCount += item.quantity; // Increase the count by the quantity of the item
    }
  }

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

// const EMPTY_DISCOUNT = {
//   discountApplicationStrategy: "FIRST", // Replace with actual strategy as needed
//   discounts: [],
// };

module.exports = {
  run,
  calculateProductTypeCount,
  calculateDiscount
};

// export function run(input) {
//   console.log("Starting discount calculation...");

//   const productType1000Count = calculateProductTypeCount(input.cart.lines, "1000");
//   const productType1500Count = calculateProductTypeCount(input.cart.lines, "1500");

//   const discount1000 = calculateDiscount(productType1000Count, "1000");
//   const discount1500 = calculateDiscount(productType1500Count, "1500");

//   if (discount1000 === 0 && discount1500 === 0) {
//     console.log("No products with the specified product types.");
//     return EMPTY_DISCOUNT;
//   }

//   console.log(`Applying a discount of Rs ${discount1000 + discount1500} to ${productType1000Count + productType1500Count} products.`);

//   const targets: Target[] = input.cart.lines
//     .filter((line) => {
//       if (line.merchandise.__typename === "ProductVariant") {
//         const productType = line.merchandise.product.productType;
//         return productType === "1000" || productType === "1500";
//       }
//       return false;
//     })
//     .map((line) => {
//       return {
//         productVariant: {
//           id: (line.merchandise as ProductVariant).id,
//         },
//       };
//     });

//   const DISCOUNTED_ITEMS: FunctionRunResult = {
//     discountApplicationStrategy: DiscountApplicationStrategy.First,
//     discounts: [
//       {
//         targets: targets,
//         value: {
//           fixedAmount: {
//             amount: discount1000 + discount1500
//           },
//         },
//         message: "MESSOLD",
//       },
//     ],
//   };

//   console.log("Discount calculation complete.");
//   return DISCOUNTED_ITEMS;
// }

// function calculateProductTypeCount(cartItems, productType) {
//   let productTypeCount = 0;

//   for (const item of cartItems) {
//     if (item.merchandise.__typename === "ProductVariant" && item.merchandise.product.productType === productType) {
//       productTypeCount += item.quantity; // Increase the count by the quantity of the item
//     }
//   }

//   return productTypeCount;
// }

// function calculateDiscount(productTypeCount, productType) {
//   if (productTypeCount >= 2 && productType === "1500") {
//     const remainder = productTypeCount % 3;

//     if (remainder === 2) {
//       return 300 + Math.floor(productTypeCount / 3) * 750;
//     } else {
//       return Math.floor(productTypeCount / 3) * 750;
//     }
//   } else if (productTypeCount >= 2 && productType === "1000") {
//     const remainder = productTypeCount % 3;

//     if (remainder === 2) {
//       return 598 + Math.floor(productTypeCount / 3) * 1097;
//     } else {
//       return Math.floor(productTypeCount / 3) * 1097;
//     }
//   } else {
//     return 0;
//   }
// }
//   const configuration = JSON.parse(
//     input?.discountNode?.metafield?.value ?? "{}"
//   );

//   return EMPTY_DISCOUNT;
// };

