
const { query } = require("../config/db");

/**
 * POST /stock/shortage/justify
 */
const saveStockShortageReason = async (req, res) => {
  try {
    const user = req.user;
    const { product_id, reason } = req.body;

    if (!product_id || !reason) {
      return res.status(400).json({
        message: "product_id and reason are required",
      });
    }

    // 1️⃣ Get current OPEN day
    const dayResult = await query(
      `
      SELECT id
      FROM day_status
      WHERE status = 'OPEN'
      ORDER BY id DESC
      LIMIT 1
      `
    );

    if (dayResult.rows.length === 0) {
      return res.status(400).json({
        message: "No open day found",
      });
    }

    const dayId = dayResult.rows[0].id;

    // 2️⃣ Calculate shortage qty (SOURCE OF TRUTH)
    const shortageResult = await query(
      `
      SELECT
        (
          d.plant_load_qty
          - COALESCE(SUM(s.quantity), 0)
          - d.counter_closing_qty
          - d.returned_to_plant_qty
        ) AS shortage_qty
      FROM daily_product_stock d
      LEFT JOIN sales s
        ON s.product_id = d.product_id
       AND s.day_id = d.day_id
      WHERE d.day_id = $1
        AND d.product_id = $2
      GROUP BY
        d.plant_load_qty,
        d.counter_closing_qty,
        d.returned_to_plant_qty
      `,
      [dayId, product_id]
    );

    if (shortageResult.rows.length === 0) {
      return res.status(400).json({
        message: "Stock entry not found for product",
      });
    }

    const shortageQty = Number(shortageResult.rows[0].shortage_qty);

    // 3️⃣ Insert or update justification (NO updated_at)
    await query(
      `
      INSERT INTO stock_shortage_reasons
        (day_id, product_id, shortage_qty, reason, entered_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (day_id, product_id)
      DO UPDATE SET
        shortage_qty = EXCLUDED.shortage_qty,
        reason = EXCLUDED.reason,
        entered_by = EXCLUDED.entered_by
      `,
      [dayId, product_id, shortageQty, reason, user.id]
    );

    return res.status(200).json({
      message: "Justification saved successfully",
    });
  } catch (err) {
    console.error("SAVE JUSTIFICATION ERROR:", err);
    return res.status(500).json({
      message: "Failed to save justification",
    });
  }
};

module.exports = {
  saveStockShortageReason,
};