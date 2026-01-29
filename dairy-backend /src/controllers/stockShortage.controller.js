// const { query } = require("../config/db");

// /**
//  * Save shortage justification
//  */
// const saveShortageReason = async (req, res) => {
//   try {
//     const user = req.user;
//     const { product_id, shortage_qty, reason } = req.body;

//     if (user.role !== "admin") {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     if (!product_id || !shortage_qty || !reason) {
//       return res.status(400).json({
//         message: "product_id, shortage_qty and reason are required",
//       });
//     }

//     const dayResult = await query(
//       `SELECT id FROM day_status ORDER BY id DESC LIMIT 1`
//     );

//     if (dayResult.rows.length === 0) {
//       return res.status(400).json({ message: "No active day found" });
//     }

//     const dayId = dayResult.rows[0].id;

//     await query(
//       `
//       INSERT INTO stock_shortage_reasons
//         (day_id, product_id, shortage_qty, reason, entered_by)
//       VALUES ($1, $2, $3, $4, $5)
//       ON CONFLICT (day_id, product_id)
//       DO UPDATE SET
//         shortage_qty = EXCLUDED.shortage_qty,
//         reason = EXCLUDED.reason,
//         entered_by = EXCLUDED.entered_by,
//         created_at = CURRENT_TIMESTAMP
//       `,
//       [dayId, product_id, shortage_qty, reason, user.id]
//     );

//     return res.status(200).json({
//       message: "Shortage reason saved successfully",
//     });
//   } catch (err) {
//     console.error("SHORTAGE ERROR:", err);
//     return res.status(500).json({
//       message: "Failed to save shortage reason",
//     });
//   }
// };

// /**
//  * Get pending shortages
//  */
// const getPendingShortages = async (req, res) => {
//   try {
//     const dayResult = await query(
//       `SELECT id FROM day_status ORDER BY id DESC LIMIT 1`
//     );

//     if (dayResult.rows.length === 0) {
//       return res.json([]);
//     }

//     const dayId = dayResult.rows[0].id;

//     const result = await query(
//       `
//       SELECT
//         sr.product_id,
//         p.name AS product_name,
//         sr.shortage_qty
//       FROM stock_reconciliation sr
//       JOIN products p ON p.id = sr.product_id
//       LEFT JOIN stock_shortage_reasons ssr
//         ON ssr.day_id = sr.day_id
//        AND ssr.product_id = sr.product_id
//       WHERE sr.day_id = $1
//         AND sr.shortage_qty > 0
//         AND ssr.id IS NULL
//       `,
//       [dayId]
//     );

//     return res.json(result.rows);
//   } catch (err) {
//     console.error("FETCH SHORTAGE ERROR:", err);
//     return res.status(500).json({
//       message: "Failed to fetch shortages",
//     });
//   }
// };

// module.exports = {
//   saveShortageReason,
//   getPendingShortages,
// };

// const { query } = require("../config/db");

// const saveStockShortageReason = async (req, res) => {
//   try {
//     const { product_id, reason } = req.body;

//     if (!product_id || !reason) {
//       return res.status(400).json({
//         message: "product_id and reason are required",
//       });
//     }

//     const dayResult = await query(
//       `
//       SELECT id
//       FROM day_status
//       WHERE status = 'OPEN'
//       ORDER BY id DESC
//       LIMIT 1
//       `
//     );

//     if (dayResult.rows.length === 0) {
//       return res.status(400).json({
//         message: "No open day found",
//       });
//     }

//     const dayId = dayResult.rows[0].id;

//     await query(
//       `
//       INSERT INTO stock_shortage_reasons
//         (day_id, product_id, reason)
//       VALUES ($1, $2, $3)
//       ON CONFLICT (day_id, product_id)
//       DO UPDATE SET
//         reason = EXCLUDED.reason,
//         updated_at = CURRENT_TIMESTAMP
//       `,
//       [dayId, product_id, reason]
//     );

//     return res.status(200).json({
//       message: "Justification saved successfully",
//     });
//   } catch (err) {
//     console.error("SAVE JUSTIFICATION ERROR:", err);
//     return res.status(500).json({
//       message: "Justification cannot be saved",
//     });
//   }
// };

// module.exports = { saveStockShortageReason };


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