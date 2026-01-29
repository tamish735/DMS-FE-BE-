const { query } = require("../config/db");

const getStockReconciliation = async (req, res) => {
  try {
    /* =========================
       1️⃣ Get today OPEN day
    ========================= */
    const todayResult = await query(`
      SELECT id, business_date
      FROM day_status
      WHERE status = 'OPEN'
      ORDER BY id DESC
      LIMIT 1
    `);

    if (todayResult.rows.length === 0) {
      return res.status(400).json({ message: "No open day found" });
    }

    const today = todayResult.rows[0];

    /* =========================
       2️⃣ Get previous CLOSED day
    ========================= */
    const prevResult = await query(
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

    const prevDayId = prevResult.rows.length
      ? prevResult.rows[0].id
      : null;

    /* =========================
       3️⃣ Fetch reconciliation data
    ========================= */
    const result = await query(
      `
      SELECT
        p.id AS product_id,
        p.name AS product_name,

        -- TODAY INPUTS
        COALESCE(td.plant_load_qty, 0) AS plant_load,
        COALESCE(td.counter_opening_qty, 0) AS counter_opening,
        COALESCE(td.counter_closing_qty, 0) AS counter_closing,
        COALESCE(td.returned_to_plant_qty, 0) AS returned_to_plant,

        -- PREVIOUS DAY
        COALESCE(pd.counter_closing_qty, 0) AS prev_counter_closing,

        -- SALES TODAY
        COALESCE(SUM(s.quantity), 0) AS sold_qty

      FROM products p

      LEFT JOIN daily_product_stock td
        ON td.product_id = p.id
       AND td.day_id = $1

      LEFT JOIN daily_product_stock pd
        ON pd.product_id = p.id
       AND pd.day_id = $2

      LEFT JOIN sales s
        ON s.product_id = p.id
       AND s.day_id = $1

      GROUP BY
        p.id, p.name,
        td.plant_load_qty,
        td.counter_opening_qty,
        td.counter_closing_qty,
        td.returned_to_plant_qty,
        pd.counter_closing_qty

      ORDER BY p.id
      `,
      [today.id, prevDayId]
    );

    /* =========================
       4️⃣ Final reconciliation math
    ========================= */
    let hasShortage = false;

    const products = result.rows.map((row) => {
      /**
       * TOTAL OPENING STOCK (SYSTEM DERIVED)
       */
      const total_opening_stock =
        Number(row.prev_counter_closing) +
        Number(row.plant_load);

      /**
       * FINAL SHORTAGE LOGIC (LOCKED)
       */
      const shortage =
        total_opening_stock -
        Number(row.counter_opening) -
        Number(row.sold_qty) -
        Number(row.counter_closing) -
        Number(row.returned_to_plant);

      if (shortage !== 0) hasShortage = true;

      return {
        product_id: row.product_id,
        product_name: row.product_name,

        total_opening_stock,
        plant_load: row.plant_load,
        prev_counter_closing: row.prev_counter_closing,

        counter_opening: row.counter_opening,
        sold_qty: row.sold_qty,

        counter_closing: row.counter_closing,
        returned_to_plant: row.returned_to_plant,

        shortage,
      };
    });

    return res.json({
      has_shortage: hasShortage,
      products,
    });
  } catch (err) {
    console.error("STOCK RECONCILIATION ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getStockReconciliation,
};









// const { query } = require("../config/db");

// const getStockReconciliation = async (req, res) => {
//   try {
//     /* =========================
//        1️⃣ Get today OPEN day
//     ========================= */
//     const todayResult = await query(`
//       SELECT id, business_date
//       FROM day_status
//       WHERE status = 'OPEN'
//       ORDER BY id DESC
//       LIMIT 1
//     `);

//     if (todayResult.rows.length === 0) {
//       return res.status(400).json({ message: "No open day found" });
//     }

//     const today = todayResult.rows[0];

//     /* =========================
//        2️⃣ Get previous CLOSED day
//     ========================= */
//     const prevResult = await query(
//       `
//       SELECT id
//       FROM day_status
//       WHERE status = 'CLOSED'
//         AND business_date < $1
//       ORDER BY business_date DESC
//       LIMIT 1
//       `,
//       [today.business_date]
//     );

//     const prevDayId = prevResult.rows.length
//       ? prevResult.rows[0].id
//       : null;

//     /* =========================
//        3️⃣ Fetch reconciliation data
//     ========================= */
//     const result = await query(
//       `
//       SELECT
//         p.id AS product_id,
//         p.name AS product_name,

//         -- TODAY INPUTS
//         COALESCE(td.plant_load_qty, 0) AS plant_load,
//         COALESCE(td.counter_opening_qty, 0) AS counter_opening,

//         -- PREVIOUS DAY
//         COALESCE(pd.counter_closing_qty, 0) AS prev_counter_closing,

//         -- SALES (TODAY)
//         COALESCE(SUM(s.quantity), 0) AS sold_qty,

//         -- TODAY CLOSING INPUTS
//         COALESCE(td.counter_closing_qty, 0) AS counter_closing,
//         COALESCE(td.returned_to_plant_qty, 0) AS returned_to_plant

//       FROM products p

//       LEFT JOIN daily_product_stock td
//         ON td.product_id = p.id
//        AND td.day_id = $1

//       LEFT JOIN daily_product_stock pd
//         ON pd.product_id = p.id
//        AND pd.day_id = $2

//       LEFT JOIN sales s
//         ON s.product_id = p.id
//        AND s.day_id = $1

//       GROUP BY
//         p.id, p.name,
//         td.plant_load_qty,
//         td.counter_opening_qty,
//         td.counter_closing_qty,
//         td.returned_to_plant_qty,
//         pd.counter_closing_qty

//       ORDER BY p.id
//       `,
//       [today.id, prevDayId]
//     );

//     /* =========================
//        4️⃣ Calculate opening & shortage
//     ========================= */
//     let hasShortage = false;

//     const products = result.rows.map((row) => {
//       /**
//        * TOTAL OPENING STOCK (SYSTEM DERIVED)
//        * yesterday counter closing + today plant load
//        */
//       const total_opening_stock =
//         Number(row.prev_counter_closing) +
//         Number(row.plant_load);

//       /**
//        * EXPECTED REMAINING AFTER SALES
//        */
//       const expected_remaining =
//         total_opening_stock - Number(row.sold_qty);

//       /**
//        * ACTUAL REMAINING (PHYSICAL INPUTS)
//        */
//       const actual_remaining =
//         Number(row.counter_closing) +
//         Number(row.returned_to_plant);

//       /**
//        * SHORTAGE / EXCESS
//        */
//       const shortage = expected_remaining - actual_remaining;

//       if (shortage !== 0) hasShortage = true;

//       return {
//         product_id: row.product_id,
//         product_name: row.product_name,

//         total_opening_stock,
//         plant_load: row.plant_load,
//         prev_counter_closing: row.prev_counter_closing,

//         sold_qty: row.sold_qty,

//         counter_opening: row.counter_opening,
//         counter_closing: row.counter_closing,
//         returned_to_plant: row.returned_to_plant,

//         shortage,
//       };
//     });

//     return res.json({
//       has_shortage: hasShortage,
//       products,
//     });
//   } catch (err) {
//     console.error("STOCK RECONCILIATION ERROR:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// module.exports = {
//   getStockReconciliation,
// };





// const { query } = require("../config/db");

// const getStockReconciliation = async (req, res) => {
//   try {
//     /* =========================
//        1️⃣ Get today OPEN day
//     ========================= */
//     const todayResult = await query(`
//       SELECT id, business_date
//       FROM day_status
//       WHERE status = 'OPEN'
//       ORDER BY id DESC
//       LIMIT 1
//     `);

//     if (todayResult.rows.length === 0) {
//       return res.status(400).json({ message: "No open day found" });
//     }

//     const today = todayResult.rows[0];

//     /* =========================
//        2️⃣ Get previous CLOSED day
//     ========================= */
//     const prevResult = await query(
//       `
//       SELECT id
//       FROM day_status
//       WHERE status = 'CLOSED'
//         AND business_date < $1
//       ORDER BY business_date DESC
//       LIMIT 1
//       `,
//       [today.business_date]
//     );

//     const prevDayId = prevResult.rows.length
//       ? prevResult.rows[0].id
//       : null;

//     /* =========================
//        3️⃣ Fetch reconciliation data
//     ========================= */
//     const result = await query(
//       `
//       SELECT
//         p.id AS product_id,
//         p.name AS product_name,

//         -- TODAY
//         COALESCE(td.plant_load_qty, 0) AS plant_load,

//         -- PREVIOUS DAY
//         COALESCE(pd.counter_closing_qty, 0) AS prev_closing,
//         COALESCE(pd.returned_to_plant_qty, 0) AS prev_returned,

//         -- SALES
//         COALESCE(SUM(s.quantity), 0) AS sold_qty,

//         -- TODAY CLOSING
//         COALESCE(td.counter_closing_qty, 0) AS counter_closing,
//         COALESCE(td.returned_to_plant_qty, 0) AS returned_to_plant

//       FROM products p

//       LEFT JOIN daily_product_stock td
//         ON td.product_id = p.id
//        AND td.day_id = $1

//       LEFT JOIN daily_product_stock pd
//         ON pd.product_id = p.id
//        AND pd.day_id = $2

//       LEFT JOIN sales s
//         ON s.product_id = p.id
//        AND s.day_id = $1

//       GROUP BY
//         p.id, p.name,
//         td.plant_load_qty,
//         td.counter_closing_qty,
//         td.returned_to_plant_qty,
//         pd.counter_closing_qty,
//         pd.returned_to_plant_qty

//       ORDER BY p.id
//       `,
//       [today.id, prevDayId]
//     );

//     /* =========================
//        4️⃣ Calculate opening & shortage
//     ========================= */
//     let hasShortage = false;

//     const products = result.rows.map((row) => {
//       const opening_stock =
//         Number(row.prev_closing) +
//         Number(row.prev_returned) +
//         Number(row.plant_load);

//       const shortage =
//         opening_stock -
//         Number(row.sold_qty) -
//         Number(row.counter_closing) -
//         Number(row.returned_to_plant);

//       if (shortage !== 0) hasShortage = true;

//       return {
//         product_id: row.product_id,
//         product_name: row.product_name,
//         opening_stock,
//         sold_qty: row.sold_qty,
//         counter_closing: row.counter_closing,
//         returned_to_plant: row.returned_to_plant,
//         shortage,
//       };
//     });

//     return res.json({
//       has_shortage: hasShortage,
//       products,
//     });
//   } catch (err) {
//     console.error("STOCK RECONCILIATION ERROR:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// module.exports = {
//   getStockReconciliation,
// };