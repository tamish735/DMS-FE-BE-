const { query } = require("../config/db");
const { logAudit } = require("../utils/auditLogger");

/* ======================================================
   GET ALL CUSTOMERS (ACTIVE ONLY)
   GET /customers
====================================================== */
const getCustomers = async (req, res) => {
  try {
    const result = await query(
      `
      SELECT id, name, phone, created_at
      FROM customers
      WHERE is_active = true
      ORDER BY name
      `
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("FETCH CUSTOMERS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch customers" });
  }
};

/* ======================================================
   CREATE CUSTOMER
   POST /customers
====================================================== */
const createCustomer = async (req, res) => {
  console.log("CREATE CUSTOMER HIT", req.body, req.user);

  try {
    let { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }

    name = name.trim();
    phone = phone.trim();

    if (!name || !phone) {
      return res
        .status(400)
        .json({ message: "Name and phone cannot be empty" });
    }

    const exists = await query(
      `SELECT id FROM customers WHERE phone = $1`,
      [phone]
    );

    if (exists.rows.length) {
      return res
        .status(400)
        .json({ message: "Customer with this phone already exists" });
    }

    const result = await query(
      `
      INSERT INTO customers (name, phone, is_active)
      VALUES ($1, $2, true)
      RETURNING id, name, phone
      `,
      [name, phone]
    );

    logAudit({
      user: req.user,
      action: "CREATE_CUSTOMER",
      entity: "customer",
      entity_id: result.rows[0].id,
      details: result.rows[0],
    });

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE CUSTOMER ERROR:", err);
    return res.status(500).json({ message: "Failed to create customer" });
  }
};

/* ======================================================
   UPDATE CUSTOMER
   PUT /customers/:id
====================================================== */
const updateCustomer = async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    let { name, phone } = req.body;

    if (!customerId) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    name = typeof name === "string" ? name.trim() : null;
    phone = typeof phone === "string" ? phone.trim() : null;

    if (!name && !phone) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    if (phone) {
      const dup = await query(
        `SELECT id FROM customers WHERE phone = $1 AND id != $2`,
        [phone, customerId]
      );
      if (dup.rows.length) {
        return res
          .status(400)
          .json({ message: "Phone already used by another customer" });
      }
    }

    const result = await query(
      `
      UPDATE customers
      SET
        name = COALESCE($1, name),
        phone = COALESCE($2, phone)
      WHERE id = $3
      RETURNING id, name, phone
      `,
      [name || null, phone || null, customerId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    logAudit({
      user: req.user,
      action: "UPDATE_CUSTOMER",
      entity: "customer",
      entity_id: customerId,
      details: result.rows[0],
    });

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE CUSTOMER ERROR:", err);
    return res.status(500).json({ message: "Failed to update customer" });
  }
};

/* ======================================================
   DEACTIVATE CUSTOMER
   DELETE /customers/:id
====================================================== */
const deactivateCustomer = async (req, res) => {
  try {
    const customerId = Number(req.params.id);

    if (!customerId) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const result = await query(
      `
      UPDATE customers
      SET is_active = false
      WHERE id = $1
      RETURNING id, name
      `,
      [customerId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    logAudit({
      user: req.user,
      action: "DEACTIVATE_CUSTOMER",
      entity: "customer",
      entity_id: customerId,
      details: { name: result.rows[0].name },
    });

    return res.json({ message: "Customer deactivated" });
  } catch (err) {
    console.error("DEACTIVATE CUSTOMER ERROR:", err);
    return res.status(500).json({ message: "Failed to deactivate customer" });
  }
};


/* ======================================================
   ACTIVATE CUSTOMER
   PATCH /customers/:id/activate
====================================================== */
const activateCustomer = async (req, res) => {
  try {
    const customerId = Number(req.params.id);

    if (!customerId) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const result = await query(
      `
      UPDATE customers
      SET is_active = true
      WHERE id = $1
      RETURNING id, name
      `,
      [customerId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Customer not found" });
    }

    logAudit({
      user: req.user,
      action: "ACTIVATE_CUSTOMER",
      entity: "customer",
      entity_id: customerId,
      details: { name: result.rows[0].name },
    });

    return res.json({ message: "Customer activated" });
  } catch (err) {
    console.error("ACTIVATE CUSTOMER ERROR:", err);
    return res.status(500).json({ message: "Failed to activate customer" });
  }
};

/* ======================================================
   GET CUSTOMER CURRENT DUE
   GET /customers/:id/due
====================================================== */
const getCustomerCurrentDue = async (req, res) => {
  try {
    const customerId = Number(req.params.id);

    if (!customerId) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const result = await query(
      `
      SELECT closing_balance
      FROM customer_daily_balance
      WHERE customer_id = $1
      ORDER BY business_date DESC
      LIMIT 1
      `,
      [customerId]
    );

    return res.status(200).json({
      due: result.rows.length
        ? Number(result.rows[0].closing_balance)
        : 0,
    });
  } catch (err) {
    console.error("FETCH CUSTOMER DUE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   CUSTOMER-SPECIFIC PRODUCT PRICING 🔥
====================================================== */

/* GET custom prices for a customer
   GET /customers/:id/prices */
const getCustomerProductPrices = async (req, res) => {
  try {
    const customerId = Number(req.params.id);

    const result = await query(
      `
      SELECT
        cpp.product_id,
        p.name AS product_name,
        cpp.custom_price
      FROM customer_product_prices cpp
      JOIN products p ON p.id = cpp.product_id
      WHERE cpp.customer_id = $1
      ORDER BY p.name
      `,
      [customerId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("FETCH CUSTOMER PRICES ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch prices" });
  }
};

/* SET / UPDATE custom price
   POST /customers/:id/prices */
const setCustomerProductPrice = async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    const { product_id, custom_price } = req.body;

    if (!product_id || custom_price === undefined) {
      return res
        .status(400)
        .json({ message: "product_id and custom_price required" });
    }

    await query(
      `
      INSERT INTO customer_product_prices
        (customer_id, product_id, custom_price)
      VALUES ($1,$2,$3)
      ON CONFLICT (customer_id, product_id)
      DO UPDATE SET custom_price = EXCLUDED.custom_price
      `,
      [customerId, product_id, custom_price]
    );

    logAudit({
      user: req.user,
      action: "SET_CUSTOM_PRICE",
      entity: "customer_product_price",
      entity_id: `${customerId}-${product_id}`,
      details: { customerId, product_id, custom_price },
    });

    return res.json({ message: "Custom price saved" });
  } catch (err) {
    console.error("SET CUSTOM PRICE ERROR:", err);
    return res.status(500).json({ message: "Failed to save custom price" });
  }
};

/* DELETE custom price
   DELETE /customers/:id/prices/:productId */
const deleteCustomerProductPrice = async (req, res) => {
  try {
    const customerId = Number(req.params.id);
    const productId = Number(req.params.productId);

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
      details: { customerId, productId },
    });

    return res.json({ message: "Custom price removed" });
  } catch (err) {
    console.error("DELETE CUSTOM PRICE ERROR:", err);
    return res.status(500).json({ message: "Failed to remove custom price" });
  }
};

module.exports = {
  getCustomers,
  createCustomer,
  updateCustomer,
  deactivateCustomer,
  getCustomerCurrentDue,

  // 🔥 pricing
  getCustomerProductPrices,
  setCustomerProductPrice,
  deleteCustomerProductPrice,
};




// const { query } = require("../config/db");
// const { logAudit } = require("../utils/auditLogger");

// /* ======================================================
//    GET ALL CUSTOMERS (ACTIVE ONLY)
//    GET /customers
// ====================================================== */
// const getCustomers = async (req, res) => {
//   try {
//     const result = await query(
//       `
//       SELECT id, name, phone, created_at
//       FROM customers
//       WHERE is_active = true
//       ORDER BY name
//       `
//     );

//     return res.json(result.rows);
//   } catch (err) {
//     console.error("FETCH CUSTOMERS ERROR:", err);
//     return res.status(500).json({ message: "Failed to fetch customers" });
//   }
// };


// /* ======================================================
//    CREATE CUSTOMER
//    POST /customers
// ====================================================== */
// const createCustomer = async (req, res) => {
//     console.log("CREATE CUSTOMER HIT", req.body, req.user);

//   try {
//     let { name, phone } = req.body;

//     if (!name || !phone) {
//       return res
//         .status(400)
//         .json({ message: "Name and phone are required" });
//     }

//     name = name.trim();
//     phone = phone.trim();

//     if (!name || !phone) {
//       return res
//         .status(400)
//         .json({ message: "Name and phone cannot be empty" });
//     }

//     // Prevent duplicate phone (normalized)
//     const exists = await query(
//       `SELECT id FROM customers WHERE phone = $1`,
//       [phone]
//     );

//     if (exists.rows.length) {
//       return res
//         .status(400)
//         .json({ message: "Customer with this phone already exists" });
//     }

//     const result = await query(
//       `
//       INSERT INTO customers (name, phone, is_active)
//       VALUES ($1, $2, true)
//       RETURNING id, name, phone
//       `,
//       [name, phone]
//     );

//     // Audit (non-blocking)
//     logAudit({
//       user: req.user,
//       action: "CREATE_CUSTOMER",
//       entity: "customer",
//       entity_id: result.rows[0].id,
//       details: result.rows[0],
//     });

//     return res.status(201).json(result.rows[0]);
//   } catch (err) {
//     console.error("CREATE CUSTOMER ERROR:", err);
//     return res.status(500).json({ message: "Failed to create customer" });
//   }
// };

// /* ======================================================
//    UPDATE CUSTOMER
//    PUT /customers/:id
// ====================================================== */
// const updateCustomer = async (req, res) => {
//   try {
//     const customerId = Number(req.params.id);
//     let { name, phone } = req.body;

//     if (!customerId) {
//       return res.status(400).json({ message: "Invalid customer id" });
//     }

//     name = typeof name === "string" ? name.trim() : null;
//     phone = typeof phone === "string" ? phone.trim() : null;

//     if (!name && !phone) {
//       return res.status(400).json({ message: "Nothing to update" });
//     }

//     // Check duplicate phone (if updating phone)
//     if (phone) {
//       const dup = await query(
//         `SELECT id FROM customers WHERE phone = $1 AND id != $2`,
//         [phone, customerId]
//       );
//       if (dup.rows.length) {
//         return res
//           .status(400)
//           .json({ message: "Phone already used by another customer" });
//       }
//     }

//     const result = await query(
//       `
//       UPDATE customers
//       SET
//         name = COALESCE($1, name),
//         phone = COALESCE($2, phone)
//       WHERE id = $3
//       RETURNING id, name, phone
//       `,
//       [name || null, phone || null, customerId]
//     );

//     if (!result.rows.length) {
//       return res.status(404).json({ message: "Customer not found" });
//     }

//     logAudit({
//       user: req.user,
//       action: "UPDATE_CUSTOMER",
//       entity: "customer",
//       entity_id: customerId,
//       details: result.rows[0],
//     });

//     return res.json(result.rows[0]);
//   } catch (err) {
//     console.error("UPDATE CUSTOMER ERROR:", err);
//     return res.status(500).json({ message: "Failed to update customer" });
//   }
// };

// /* ======================================================
//    DEACTIVATE CUSTOMER (SOFT DELETE)
//    DELETE /customers/:id
// ====================================================== */
// const deactivateCustomer = async (req, res) => {
//   try {
//     const customerId = Number(req.params.id);

//     if (!customerId) {
//       return res.status(400).json({ message: "Invalid customer id" });
//     }

//     const result = await query(
//       `
//       UPDATE customers
//       SET is_active = false
//       WHERE id = $1
//       RETURNING id, name
//       `,
//       [customerId]
//     );

//     if (!result.rows.length) {
//       return res.status(404).json({ message: "Customer not found" });
//     }

//     logAudit({
//       user: req.user,
//       action: "DEACTIVATE_CUSTOMER",
//       entity: "customer",
//       entity_id: customerId,
//       details: { name: result.rows[0].name },
//     });

//     return res.json({ message: "Customer deactivated" });
//   } catch (err) {
//     console.error("DEACTIVATE CUSTOMER ERROR:", err);
//     return res.status(500).json({ message: "Failed to deactivate customer" });
//   }
// };

// /* ======================================================
//    GET CUSTOMER CURRENT DUE
//    GET /customers/:id/due
// ====================================================== */
// const getCustomerCurrentDue = async (req, res) => {
//   try {
//     const customerId = Number(req.params.id);

//     if (!customerId) {
//       return res.status(400).json({ message: "Invalid customer id" });
//     }

//     const result = await query(
//       `
//       SELECT closing_balance
//       FROM customer_daily_balance
//       WHERE customer_id = $1
//       ORDER BY business_date DESC
//       LIMIT 1
//       `,
//       [customerId]
//     );

//     return res.status(200).json({
//       due: result.rows.length
//         ? Number(result.rows[0].closing_balance)
//         : 0,
//     });
//   } catch (err) {
//     console.error("FETCH CUSTOMER DUE ERROR:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };

// module.exports = {
//   getCustomers,
//   createCustomer,
//   updateCustomer,
//   deactivateCustomer,
//   getCustomerCurrentDue,
// };