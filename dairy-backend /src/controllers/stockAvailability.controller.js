const { query } = require("../config/db");

/**
 * GET /stock/available/:product_id
 *
 * FINAL, CORRECT AVAILABILITY LOGIC
 */
const getAvailableStock = async (req, res) => {
  try {
    const productId = Number(req.params.product_id);

    /* =========================
       1️⃣ Get OPEN day
    ========================= */
    const dayRes = await query(`
      SELECT id, business_date
      FROM day_status
      WHERE status = 'OPEN'
      ORDER BY business_date DESC
      LIMIT 1
    `);

    if (!dayRes.rows.length) {
      return res.json({ available_qty: 0 });
    }

    const openDayId = dayRes.rows[0].id;

    /* =========================
       2️⃣ Get last CLOSED day
    ========================= */
    const prevDayRes = await query(`
      SELECT id
      FROM day_status
      WHERE status = 'CLOSED'
      ORDER BY business_date DESC
      LIMIT 1
    `);

    const prevDayId = prevDayRes.rows.length
      ? prevDayRes.rows[0].id
      : null;

    /* =========================
       3️⃣ CORRECT STOCK QUERY
       (START FROM PRODUCTS)
    ========================= */
    const result = await query(
      `
      SELECT
        COALESCE(td.plant_load_qty, 0)        AS plant_load,
        COALESCE(td.counter_opening_qty, 0)  AS counter_opening,
        COALESCE(pd.counter_closing_qty, 0)  AS prev_counter_closing,
        COALESCE(SUM(s.quantity), 0)          AS sold_qty
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
      [productId, openDayId, prevDayId]
    );

    if (!result.rows.length) {
      return res.json({ available_qty: 0 });
    }

    const row = result.rows[0];

    /* =========================
       4️⃣ FINAL CALCULATION
    ========================= */
    const totalOpening =
      Number(row.prev_counter_closing) + Number(row.plant_load);

    const availableQty =
      totalOpening -
      Number(row.counter_opening) -
      Number(row.sold_qty);

    return res.json({
      available_qty: Math.max(availableQty, 0),
    });
  } catch (err) {
    console.error("AVAILABLE STOCK ERROR:", err);
    return res.status(500).json({
      message: "Failed to fetch available stock",
      available_qty: 0,
    });
  }
};

module.exports = { getAvailableStock };