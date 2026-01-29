// const { query } = require("../config/db");

// const getDayEndReport = async (req, res) => {
//   try {
//     // 1) Get the latest day record
//     const dayResult = await query(
//       `
//       SELECT id, business_date, status
//       FROM day_status
//       ORDER BY id DESC
//       LIMIT 1
//       `
//     );

//     if (dayResult.rows.length === 0) {
//       return res.status(400).json({
//         message: "No day record found",
//       });
//     }

//     const day = dayResult.rows[0];
//     const dayId = day.id;

//     // 2) Aggregate sales
//     const salesResult = await query(
//       `
//       SELECT COALESCE(SUM(amount), 0) AS total_sales
//       FROM sales
//       WHERE day_id = $1
//       `,
//       [dayId]
//     );

//     // 3) Aggregate payments by mode
//     const paymentsResult = await query(
//       `
//       SELECT
//         COALESCE(SUM(CASE WHEN mode = 'cash' THEN amount END), 0) AS cash_collected,
//         COALESCE(SUM(CASE WHEN mode = 'online' THEN amount END), 0) AS online_collected,
//         COALESCE(SUM(amount), 0) AS total_collected
//       FROM payments
//       WHERE day_id = $1
//       `,
//       [dayId]
//     );

//     const totalSales = Number(salesResult.rows[0].total_sales);
//     const cashCollected = Number(paymentsResult.rows[0].cash_collected);
//     const onlineCollected = Number(paymentsResult.rows[0].online_collected);
//     const totalCollected = Number(paymentsResult.rows[0].total_collected);

//     // 4) Net due change for the day
//     const netDueChange = totalSales - totalCollected;

//     // 5) Respond
//     return res.status(200).json({
//       business_date: day.business_date.toISOString().split("T")[0],
//       status: day.status,
//       total_sales: totalSales,
//       cash_collected: cashCollected,
//       online_collected: onlineCollected,
//       total_collected: totalCollected,
//       net_due_change: netDueChange,
//     });
//   } catch (error) {
//     console.error("DAY REPORT ERROR:", error);
//     return res.status(500).json({
//       message: "Failed to fetch day-end report",
//     });
//   }
// };

// module.exports = {
//   getDayEndReport,
// };





const { query } = require("../config/db");

const getDayEndReport = async (req, res) => {
  try {
    /* =========================
       1. FETCH CLOSED DAY
    ========================= */
    const dayResult = await query(
      `SELECT * FROM day_status
       WHERE status IN ('CLOSED', 'LOCKED')
       ORDER BY business_date DESC
       LIMIT 1`
    );

    if (dayResult.rows.length === 0) {
      return res.status(400).json({
        message: "Day must be CLOSED or LOCKED to view report"
      });
    }

    const day = dayResult.rows[0];
    const dayId = day.id;

    /* =========================
       2. FINANCIALS
    ========================= */

    const salesSum = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM sales
       WHERE day_id = $1`,
      [dayId]
    );

    const paymentsByMode = await query(
      `SELECT mode, COALESCE(SUM(amount), 0) AS total
       FROM payments
       WHERE day_id = $1
       GROUP BY mode`,
      [dayId]
    );

    let cashCollected = 0;
    let onlineCollected = 0;

    paymentsByMode.rows.forEach(row => {
      if (row.mode === "cash") cashCollected = Number(row.total);
      if (row.mode === "online") onlineCollected = Number(row.total);
    });

    const totalSales = Number(salesSum.rows[0].total);
    const totalCollected = cashCollected + onlineCollected;
    const netDueChange = totalSales - totalCollected;

    /* =========================
       3. PRODUCT STOCK REPORT
    ========================= */

    const productReport = await query(
      `SELECT
         p.id AS product_id,
         p.name AS product_name,
         dps.plant_load_qty,
         dps.counter_closing_qty,
         dps.returned_to_plant_qty,
         COALESCE(SUM(s.quantity), 0) AS sold_quantity
       FROM products p
       JOIN daily_product_stock dps ON dps.product_id = p.id
       LEFT JOIN sales s
         ON s.product_id = p.id AND s.day_id = $1
       WHERE dps.day_id = $1
       GROUP BY p.id, p.name,
                dps.plant_load_qty,
                dps.counter_closing_qty,
                dps.returned_to_plant_qty
       ORDER BY p.id`,
      [dayId]
    );

    const products = productReport.rows.map(row => {
      const openingStock = Number(row.plant_load_qty);
      const soldQty = Number(row.sold_quantity);
      const closingStock = Number(row.counter_closing_qty);
      const returned = Number(row.returned_to_plant_qty);

      const shortage =
        openingStock - soldQty - closingStock - returned;

      return {
        product_id: row.product_id,
        product_name: row.product_name,
        opening_stock: openingStock,
        sold_quantity: soldQty,
        counter_closing_stock: closingStock,
        returned_to_plant: returned,
        calculated_shortage: shortage
      };
    });

    /* =========================
       4. CUSTOMER SUMMARY
    ========================= */

    const customerSummary = await query(
      `SELECT
         COUNT(DISTINCT s.customer_id) AS customers_billed,
         COUNT(*) FILTER (WHERE cdb.closing_balance > 0) AS customers_with_due,
         COALESCE(SUM(cdb.closing_balance), 0) AS total_due
       FROM customer_daily_balance cdb
       LEFT JOIN sales s
         ON s.customer_id = cdb.customer_id AND s.day_id = $1
       WHERE cdb.business_date = $2`,
      [dayId, day.business_date]
    );

    /* =========================
       5. FINAL RESPONSE
    ========================= */

    return res.json({
      business_date: day.business_date,
      day_status: day.status,

      financials: {
        total_sales: totalSales,
        cash_collected: cashCollected,
        online_collected: onlineCollected,
        total_collected: totalCollected,
        net_due_change: netDueChange
      },

      products,

      customers_summary: {
        customers_billed: Number(customerSummary.rows[0].customers_billed),
        total_customers_with_due: Number(customerSummary.rows[0].customers_with_due),
        total_due_amount: Number(customerSummary.rows[0].total_due)
      }
    });

  } catch (err) {
    console.error("DAY REPORT ERROR:", err);
    return res.status(500).json({
      message: "Failed to generate day-end report"
    });
  }
};

module.exports = {
  getDayEndReport
};