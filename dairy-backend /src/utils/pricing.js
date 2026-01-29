const { query } = require("../config/db");

/**
 * Returns the final price for a product for a given customer
 */
const getFinalProductPrice = async (customerId, productId) => {
  // 1. Check customer-specific override
  const overrideResult = await query(
    `SELECT custom_price
     FROM customer_product_prices
     WHERE customer_id = $1 AND product_id = $2`,
    [customerId, productId]
  );

  if (overrideResult.rows.length > 0) {
    return Number(overrideResult.rows[0].custom_price);
  }

  // 2. Fallback to product default price
  const productResult = await query(
    `SELECT default_price
     FROM products
     WHERE id = $1 AND is_active = true`,
    [productId]
  );

  if (productResult.rows.length === 0) {
    throw new Error("Product not found or inactive");
  }

  const price = productResult.rows[0].default_price;

  if (price === null) {
    throw new Error("Product price not set");
  }

  return Number(price);
};

module.exports = {
  getFinalProductPrice
};