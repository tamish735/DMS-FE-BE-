const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const authMiddleware = require("../middleware/auth.middleware");

/**
 * GET /stock/available/:productId
 *
 * AVAILABLE STOCK FOR BILLING (OPEN DAY)
 *
 * LOGIC:
 * total_opening =
 *   yesterday.counter_closing
 * + today.plant_load
 *
 * available =
 *   total_opening
 * - today.counter_opening
 * - sold_today
 */
router.get(
  "/stock/available/:productId",
  authMiddleware,
  async (req, res) => {
    try {
      const productId = Number(req.params.productId);

      /* =========================
         1️⃣ Get OPEN day
      ========================= */
      const dayResult = await query(`
        SELECT id, business_date
        FROM day_status
        WHERE status = 'OPEN'
        ORDER BY id DESC
        LIMIT 1
      `);

      if (!dayResult.rows.length) {
        return res.json({ available_stock: 0 });
      }

      const today = dayResult.rows[0];

      /* =========================
         2️⃣ Get previous CLOSED day
      ========================= */
      const prevDayResult = await query(
        `
        SELECT id
        FROM day_status
        WHERE status = 'CLOSED'
          AND business_date < $1
        ORDER BY business_date DESC
        LIMIT 1
        `,
        [today.business_date]
      );

      const prevDayId = prevDayResult.rows.length
        ? prevDayResult.rows[0].id
        : null;

      /* =========================
         3️⃣ Fetch stock + sales
      ========================= */
      const result = await query(
        `
        SELECT
          COALESCE(td.plant_load_qty, 0) AS plant_load,
          COALESCE(td.counter_opening_qty, 0) AS counter_opening,
          COALESCE(pd.counter_closing_qty, 0) AS prev_counter_closing,
          COALESCE(SUM(s.quantity), 0) AS sold_qty
        FROM products p
        LEFT JOIN daily_product_stock td
          ON td.product_id = p.id
         AND td.day_id = $2
        LEFT JOIN daily_product_stock pd
          ON pd.product_id = p.id
         AND pd.day_id = $3
        LEFT JOIN sales s
          ON s.product_id = p.id
         AND s.day_id = $2
        WHERE p.id = $1
        GROUP BY
          td.plant_load_qty,
          td.counter_opening_qty,
          pd.counter_closing_qty
        `,
        [productId, today.id, prevDayId]
      );

      if (!result.rows.length) {
        return res.json({ available_stock: 0 });
      }

      const row = result.rows[0];

      /* =========================
         4️⃣ Final available stock
      ========================= */
      const totalOpening =
        Number(row.prev_counter_closing) +
        Number(row.plant_load);

      const availableStock =
        totalOpening -
        Number(row.counter_opening) -
        Number(row.sold_qty);

      return res.json({
        available_stock: Math.max(availableStock, 0),
      });
    } catch (err) {
      console.error("AVAILABLE STOCK ERROR:", err);
      return res.status(500).json({
        message: "Failed to fetch available stock",
        available_stock: 0,
      });
    }
  }
);

module.exports = router;