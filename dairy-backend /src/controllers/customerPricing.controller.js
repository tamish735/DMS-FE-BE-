// const { query } = require("../config/db");
// const { logAudit } = require("../utils/auditLogger");

// /* =========================
//    CHECK IF DAY IS OPEN
// ========================= */
// const ensureDayIsOpen = async () => {
//   const res = await query(
//     `SELECT id FROM day_status WHERE status = 'OPEN' LIMIT 1`
//   );
//   return res.rows.length > 0;
// };

// /* =========================
//    GET CUSTOMER-SPECIFIC PRICES
//    GET /customers/:id/prices
// ========================= */
// const getCustomerPrices = async (req, res) => {
//   try {
//     const customerId = Number(req.params.id);

//     if (!customerId) {
//       return res.status(400).json({ message: "Invalid customer id" });
//     }

//     const result = await query(
//       `
//       SELECT product_id, custom_price
//       FROM customer_product_prices
//       WHERE customer_id = $1
//       `,
//       [customerId]
//     );

//     return res.json(result.rows);
//   } catch (err) {
//     console.error("FETCH CUSTOMER PRICES ERROR:", err);
//     return res.status(500).json({ message: "Failed to fetch prices" });
//   }
// };

// /* =========================
//    SET / UPDATE CUSTOMER PRICE
//    POST /customers/:id/prices
// ========================= */
// const setCustomerPrice = async (req, res) => {
//   try {
//     const customerId = Number(req.params.id);
//     const { product_id, custom_price } = req.body;

//     if (!customerId || !product_id || !custom_price) {
//       return res.status(400).json({ message: "Invalid data" });
//     }

//     /* 🔒 HARD DAY LOCK */
//     const isOpen = await ensureDayIsOpen();
//     if (!isOpen) {
//       return res.status(403).json({
//         message: "Cannot change prices when day is closed",
//       });
//     }

//     await query(
//       `
//       INSERT INTO customer_product_prices (customer_id, product_id, custom_price)
//       VALUES ($1, $2, $3)
//       ON CONFLICT (customer_id, product_id)
//       DO UPDATE SET custom_price = EXCLUDED.custom_price
//       `,
//       [customerId, product_id, custom_price]
//     );

//     /* AUDIT LOG */
//     logAudit({
//       user: req.user,
//       action: "SET_CUSTOM_PRICE",
//       entity: "customer_product_price",
//       entity_id: `${customerId}-${product_id}`,
//       details: { customer_id: customerId, product_id, custom_price },
//     });

//     return res.json({ message: "Custom price saved" });
//   } catch (err) {
//     console.error("SET CUSTOMER PRICE ERROR:", err);
//     return res.status(500).json({ message: "Failed to save price" });
//   }
// };

// /* =========================
//    REMOVE CUSTOMER PRICE
//    DELETE /customers/:id/prices/:productId
// ========================= */
// const removeCustomerPrice = async (req, res) => {
//   try {
//     const customerId = Number(req.params.id);
//     const productId = Number(req.params.productId);

//     if (!customerId || !productId) {
//       return res.status(400).json({ message: "Invalid data" });
//     }

//     /* 🔒 HARD DAY LOCK */
//     const isOpen = await ensureDayIsOpen();
//     if (!isOpen) {
//       return res.status(403).json({
//         message: "Cannot change prices when day is closed",
//       });
//     }

//     await query(
//       `
//       DELETE FROM customer_product_prices
//       WHERE customer_id = $1 AND product_id = $2
//       `,
//       [customerId, productId]
//     );

//     /* AUDIT LOG */
//     logAudit({
//       user: req.user,
//       action: "REMOVE_CUSTOM_PRICE",
//       entity: "customer_product_price",
//       entity_id: `${customerId}-${productId}`,
//       details: { customer_id: customerId, product_id: productId },
//     });

//     return res.json({ message: "Custom price removed" });
//   } catch (err) {
//     console.error("REMOVE CUSTOMER PRICE ERROR:", err);
//     return res.status(500).json({ message: "Failed to remove price" });
//   }
// };

// module.exports = {
//   getCustomerPrices,
//   setCustomerPrice,
//   removeCustomerPrice,
// };




const { query } = require("../config/db");
const { logAudit } = require("../utils/auditLogger");

/* ======================================================
   GET CUSTOMER-SPECIFIC PRICES
   GET /customers/:id/prices
====================================================== */
const getCustomerPrices = async (req, res) => {
  try {
    const customerId = Number(req.params.id);

    if (!customerId) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const result = await query(
      `
      SELECT product_id, custom_price
      FROM customer_product_prices
      WHERE customer_id = $1
      `,
      [customerId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("FETCH CUSTOMER PRICES ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch prices" });
  }
};

/* ======================================================
   SET / UPDATE CUSTOMER PRICE
   POST /customers/:id/prices
====================================================== */
const setCustomerPrice = async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    const { product_id, custom_price } = req.body;

    if (!customerId || !product_id || !custom_price || custom_price <= 0) {
      return res.status(400).json({ message: "Invalid pricing data" });
    }

    const result = await query(
      `
      INSERT INTO customer_product_prices (customer_id, product_id, custom_price)
      VALUES ($1, $2, $3)
      ON CONFLICT (customer_id, product_id)
      DO UPDATE SET custom_price = EXCLUDED.custom_price
      RETURNING *
      `,
      [customerId, product_id, custom_price]
    );

    logAudit({
      user: req.user,
      action: "SET_CUSTOM_PRICE",
      entity: "customer_product_price",
      entity_id: `${customerId}-${product_id}`,
      details: result.rows[0],
    });

    return res.json({ message: "Custom price saved" });
  } catch (err) {
    console.error("SET CUSTOMER PRICE ERROR:", err);
    return res.status(500).json({ message: "Failed to save price" });
  }
};

/* ======================================================
   REMOVE CUSTOMER PRICE
   DELETE /customers/:id/prices/:productId
====================================================== */
const removeCustomerPrice = async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    const productId = Number(req.params.productId);

    if (!customerId || !productId) {
      return res.status(400).json({ message: "Invalid parameters" });
    }

    await query(
      `
      DELETE FROM customer_product_prices
      WHERE customer_id = $1 AND product_id = $2
      `,
      [customerId, productId]
    );

    logAudit({
      user: req.user,
      action: "REMOVE_CUSTOM_PRICE",
      entity: "customer_product_price",
      entity_id: `${customerId}-${productId}`,
    });

    return res.json({ message: "Custom price removed" });
  } catch (err) {
    console.error("REMOVE CUSTOMER PRICE ERROR:", err);
    return res.status(500).json({ message: "Failed to remove price" });
  }
};

module.exports = {
  getCustomerPrices,
  setCustomerPrice,
  removeCustomerPrice,
};