console.log("✅ customer.routes.js loaded");

const express = require("express");
const router = express.Router();

const { query } = require("../config/db");
const authMiddleware = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

/* =========================
   GET ALL CUSTOMERS
   (ACTIVE + INACTIVE)
========================= */
router.get("/customers", authMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, phone, is_active, created_at
      FROM customers
      ORDER BY name
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("FETCH CUSTOMERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   GET ACTIVE CUSTOMERS ONLY
   (FOR BILLING / LEDGER)
========================= */
router.get("/customers/active", authMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT id, name, phone
      FROM customers
      WHERE is_active = true
      ORDER BY name
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("FETCH ACTIVE CUSTOMERS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   CREATE CUSTOMER
========================= */
router.post(
  "/customers",
  authMiddleware,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      let { name, phone } = req.body;

      if (!name || !phone) {
        return res.status(400).json({
          message: "Name and phone are required",
        });
      }

      name = name.trim();
      phone = phone.trim();

      const exists = await query(
        `SELECT id FROM customers WHERE phone = $1`,
        [phone]
      );

      if (exists.rows.length) {
        return res.status(400).json({
          message: "Customer with this phone already exists",
        });
      }

      const result = await query(
        `
        INSERT INTO customers (name, phone, is_active, created_at)
        VALUES ($1, $2, true, NOW())
        RETURNING id, name, phone, is_active, created_at
        `,
        [name, phone]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("CREATE CUSTOMER ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* =========================
   UPDATE CUSTOMER
========================= */
router.put(
  "/customers/:id",
  authMiddleware,
  requireRole("admin", "super_admin"),
  async (req, res) => {
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
          return res.status(400).json({
            message: "Phone already used by another customer",
          });
        }
      }

      const result = await query(
        `
        UPDATE customers
        SET
          name = COALESCE($1, name),
          phone = COALESCE($2, phone)
        WHERE id = $3
        RETURNING id, name, phone, is_active
        `,
        [name, phone, customerId]
      );

      if (!result.rows.length) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(result.rows[0]);
    } catch (err) {
      console.error("UPDATE CUSTOMER ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* =========================
   DEACTIVATE CUSTOMER
========================= */
router.patch(
  "/customers/:id/deactivate",
  authMiddleware,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const customerId = Number(req.params.id);

      const result = await query(
        `
        UPDATE customers
        SET is_active = false
        WHERE id = $1 AND is_active = true
        RETURNING id
        `,
        [customerId]
      );

      if (!result.rows.length) {
        return res.status(400).json({
          message: "Customer already inactive or not found",
        });
      }

      res.json({ message: "Customer deactivated" });
    } catch (err) {
      console.error("DEACTIVATE CUSTOMER ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* =========================
   ACTIVATE CUSTOMER
========================= */
router.patch(
  "/customers/:id/activate",
  authMiddleware,
  requireRole("admin", "super_admin"),
  async (req, res) => {
    try {
      const customerId = Number(req.params.id);

      const result = await query(
        `
        UPDATE customers
        SET is_active = true
        WHERE id = $1 AND is_active = false
        RETURNING id
        `,
        [customerId]
      );

      if (!result.rows.length) {
        return res.status(400).json({
          message: "Customer already active or not found",
        });
      }

      res.json({ message: "Customer activated" });
    } catch (err) {
      console.error("ACTIVATE CUSTOMER ERROR:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* =========================
   CUSTOMER DUE
========================= */
router.get("/customers/:id/due", authMiddleware, async (req, res) => {
  try {
    const customerId = Number(req.params.id);

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

    res.json({
      due: result.rows.length
        ? Number(result.rows[0].closing_balance)
        : 0,
    });
  } catch (err) {
    console.error("FETCH CUSTOMER DUE ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;