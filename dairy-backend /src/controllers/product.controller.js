const { query } = require("../config/db");
const { logAudit } = require("../utils/auditLogger");

/* =======================
   ADD PRODUCT (ADMIN)
======================= */
const addProduct = async (req, res) => {
  try {
    const { name, unit, default_price } = req.body;

    if (!name || !unit) {
      return res.status(400).json({
        message: "Name and unit are required",
      });
    }

    const exists = await query(
      `SELECT id FROM products WHERE LOWER(name) = LOWER($1)`,
      [name.trim()]
    );

    if (exists.rows.length) {
      return res.status(400).json({
        message: "Product with this name already exists",
      });
    }

    let price = null;
    if (default_price !== undefined && default_price !== null) {
      const p = Number(default_price);
      if (isNaN(p) || p < 0) {
        return res.status(400).json({
          message: "Invalid default price",
        });
      }
      price = p;
    }

    const result = await query(
      `
      INSERT INTO products (name, unit, default_price, is_active)
      VALUES ($1, $2, $3, true)
      RETURNING id, name, unit, default_price, is_active
      `,
      [name.trim(), unit.trim(), price]
    );

    logAudit({
      user: req.user,
      action: "CREATE_PRODUCT",
      entity: "product",
      entity_id: result.rows[0].id,
      details: result.rows[0],
    });

    res.status(201).json({
      message: "Product added",
      product: result.rows[0],
    });
  } catch (err) {
    console.error("ADD PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =======================
   UPDATE PRODUCT (ADMIN)
======================= */
const updateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { name, unit, default_price } = req.body;

    if (!productId) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    let price = undefined;
    if (default_price !== undefined) {
      const p = Number(default_price);
      if (isNaN(p) || p < 0) {
        return res.status(400).json({
          message: "Invalid default price",
        });
      }
      price = p;
    }

    if (name) {
      const dup = await query(
        `
        SELECT id FROM products
        WHERE LOWER(name) = LOWER($1)
          AND id != $2
        `,
        [name.trim(), productId]
      );

      if (dup.rows.length) {
        return res.status(400).json({
          message: "Another product with this name already exists",
        });
      }
    }

    const result = await query(
      `
      UPDATE products
      SET
        name = COALESCE($1, name),
        unit = COALESCE($2, unit),
        default_price = COALESCE($3, default_price),
        updated_at = NOW()
      WHERE id = $4
      RETURNING id, name, unit, default_price, is_active
      `,
      [
        name?.trim() ?? null,
        unit?.trim() ?? null,
        price,
        productId,
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Product not found" });
    }

    logAudit({
      user: req.user,
      action: "UPDATE_PRODUCT",
      entity: "product",
      entity_id: productId,
      details: result.rows[0],
    });

    res.json({
      message: "Product updated",
      product: result.rows[0],
    });
  } catch (err) {
    console.error("UPDATE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =======================
   LIST ACTIVE PRODUCTS
   (BILLING)
======================= */
const listActiveProducts = async (req, res) => {
  try {
    const result = await query(
      `
      SELECT id, name, unit, default_price
      FROM products
      WHERE is_active = true
      ORDER BY name
      `
    );

    res.json({ products: result.rows });
  } catch (err) {
    console.error("FETCH ACTIVE PRODUCTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =======================
   LIST ALL PRODUCTS
   (PRODUCT MANAGEMENT)
======================= */
const listAllProducts = async (req, res) => {
  try {
    const result = await query(
      `
      SELECT id, name, unit, default_price, is_active
      FROM products
      ORDER BY name
      `
    );

    res.json({ products: result.rows });
  } catch (err) {
    console.error("FETCH ALL PRODUCTS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =======================
   DEACTIVATE PRODUCT
======================= */
const deactivateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const result = await query(
      `
      UPDATE products
      SET is_active = false
      WHERE id = $1 AND is_active = true
      RETURNING id
      `,
      [productId]
    );

    if (!result.rows.length) {
      return res.status(400).json({
        message: "Product already inactive or not found",
      });
    }

    logAudit({
      user: req.user,
      action: "DEACTIVATE_PRODUCT",
      entity: "product",
      entity_id: productId,
    });

    res.json({ message: "Product deactivated" });
  } catch (err) {
    console.error("DEACTIVATE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =======================
   ACTIVATE PRODUCT
======================= */
const activateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const result = await query(
      `
      UPDATE products
      SET is_active = true
      WHERE id = $1 AND is_active = false
      RETURNING id
      `,
      [productId]
    );

    if (!result.rows.length) {
      return res.status(400).json({
        message: "Product already active or not found",
      });
    }

    logAudit({
      user: req.user,
      action: "ACTIVATE_PRODUCT",
      entity: "product",
      entity_id: productId,
    });

    res.json({ message: "Product activated" });
  } catch (err) {
    console.error("ACTIVATE PRODUCT ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  addProduct,
  updateProduct,
  listActiveProducts,
  listAllProducts,
  deactivateProduct,
  activateProduct,
};