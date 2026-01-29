// const { query } = require("../config/db");

// /* ======================================================
//    GET SINGLE INVOICE (READ ONLY)
// ====================================================== */
// const getInvoiceById = async (req, res) => {
//   try {
//     const { invoice_id } = req.params;

//     if (!invoice_id) {
//       return res.status(400).json({ message: "invoice_id is required" });
//     }

//     /* ---------- SALES (ITEMS) ---------- */
//     const salesRes = await query(
//       `
//       SELECT
//         s.invoice_id,
//         s.day_id,
//         d.business_date,
//         s.customer_id,
//         c.name AS customer_name,
//         s.product_id,
//         p.name AS product_name,
//         s.quantity,
//         s.rate,
//         s.amount
//       FROM sales s
//       JOIN customers c ON c.id = s.customer_id
//       JOIN products p ON p.id = s.product_id
//       JOIN day_status d ON d.id = s.day_id
//       WHERE s.invoice_id = $1
//       ORDER BY s.id
//       `,
//       [invoice_id]
//     );

//     if (salesRes.rows.length === 0) {
//       return res.status(404).json({ message: "Invoice not found" });
//     }

//     /* ---------- PAYMENTS ---------- */
//     const paymentsRes = await query(
//       `
//       SELECT mode, amount
//       FROM payments
//       WHERE invoice_id = $1
//       `,
//       [invoice_id]
//     );

//     const first = salesRes.rows[0];

//     const items = salesRes.rows.map(row => ({
//       product_id: row.product_id,
//       product_name: row.product_name,
//       quantity: Number(row.quantity),
//       rate: Number(row.rate),
//       amount: Number(row.amount),
//     }));

//     const subtotal = items.reduce((s, i) => s + i.amount, 0);

//     let cashPaid = 0;
//     let onlinePaid = 0;

//     for (const p of paymentsRes.rows) {
//       if (p.mode === "cash") cashPaid += Number(p.amount);
//       if (p.mode === "online") onlinePaid += Number(p.amount);
//     }

//     const totalPaid = cashPaid + onlinePaid;
//     const due = subtotal - totalPaid;

//     return res.status(200).json({
//       invoice_id,
//       business_date: first.business_date,
//       customer: {
//         id: first.customer_id,
//         name: first.customer_name,
//       },
//       items,
//       summary: {
//         subtotal: Number(subtotal.toFixed(2)),
//         cash_paid: Number(cashPaid.toFixed(2)),
//         online_paid: Number(onlinePaid.toFixed(2)),
//         total_paid: Number(totalPaid.toFixed(2)),
//         due: Number(due.toFixed(2)),
//       },
//       immutable: true,
//     });
//   } catch (err) {
//     console.error("INVOICE FETCH ERROR:", err);
//     return res.status(500).json({ message: "Failed to fetch invoice" });
//   }
// };

// /* ======================================================
//    GET INVOICE LIST (OPEN + CLOSED, ROLE AWARE)
//    GET /invoices
// ====================================================== */
// const getInvoiceList = async (req, res) => {
//   try {
//     const user = req.user;

//     let queryText;

//     /* ---------- VENDOR & ADMIN ----------
//        Vendor: OPEN + CLOSED
//        Admin: ALL (same query for now)
//     */
//     queryText = `
//       SELECT
//         s.invoice_id,
//         MIN(s.created_at) AS invoice_time,
//         d.business_date,
//         c.name AS customer_name,
//         SUM(s.amount) AS total_amount
//       FROM sales s
//       JOIN day_status d ON d.id = s.day_id
//       JOIN customers c ON c.id = s.customer_id
//       GROUP BY
//         s.invoice_id,
//         d.business_date,
//         c.name
//       ORDER BY invoice_time DESC
//     `;

//     const result = await query(queryText);

//     return res.status(200).json({
//       invoices: result.rows.map(row => ({
//         invoice_id: row.invoice_id,
//         invoice_time: row.invoice_time, // 👈 REAL timestamp
//         business_date: row.business_date,
//         customer_name: row.customer_name,
//         total_amount: Number(row.total_amount),
//       })),
//     });
//   } catch (err) {
//     console.error("INVOICE LIST ERROR:", err);
//     return res.status(500).json({ message: "Failed to fetch invoices" });
//   }
// };

// module.exports = {
//   getInvoiceById,
//   getInvoiceList,
// };

const { query } = require("../config/db");

/* ======================================================
   GET SINGLE INVOICE (READ ONLY, ROLE SAFE)
====================================================== */
const getInvoiceById = async (req, res) => {
  try {
    const { invoice_id } = req.params;
    const user = req.user;

    if (!invoice_id) {
      return res.status(400).json({ message: "invoice_id is required" });
    }

    /* =========================
       FETCH SALES (with day status)
    ========================= */
    const salesRes = await query(
      `
      SELECT
        s.invoice_id,
        s.day_id,
        d.business_date,
        d.status AS day_status,
        s.customer_id,
        c.name AS customer_name,
        s.product_id,
        p.name AS product_name,
        s.quantity,
        s.rate,
        s.amount
      FROM sales s
      JOIN customers c ON c.id = s.customer_id
      JOIN products p ON p.id = s.product_id
      JOIN day_status d ON d.id = s.day_id
      WHERE s.invoice_id = $1
      ORDER BY s.id
      `,
      [invoice_id]
    );

    if (salesRes.rows.length === 0) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const first = salesRes.rows[0];

    /* =========================
       🔐 ROLE CHECK (VENDOR)
    ========================= */
    if (user.role === "vendor" && first.day_status !== "OPEN") {
      return res.status(403).json({
        message: "Vendors can only access OPEN day invoices",
      });
    }

    /* =========================
       PAYMENTS
    ========================= */
    const paymentsRes = await query(
      `
      SELECT mode, amount
      FROM payments
      WHERE invoice_id = $1
      `,
      [invoice_id]
    );

    const items = salesRes.rows.map(row => ({
      product_id: row.product_id,
      product_name: row.product_name,
      quantity: Number(row.quantity),
      rate: Number(row.rate),
      amount: Number(row.amount),
    }));

    const subtotal = items.reduce((s, i) => s + i.amount, 0);

    let cashPaid = 0;
    let onlinePaid = 0;

    for (const p of paymentsRes.rows) {
      if (p.mode === "cash") cashPaid += Number(p.amount);
      if (p.mode === "online") onlinePaid += Number(p.amount);
    }

    const totalPaid = cashPaid + onlinePaid;
    const due = subtotal - totalPaid;

    return res.status(200).json({
      invoice_id,
      business_date: first.business_date,
      customer: {
        id: first.customer_id,
        name: first.customer_name,
      },
      items,
      summary: {
        subtotal,
        cash_paid: cashPaid,
        online_paid: onlinePaid,
        total_paid: totalPaid,
        due,
      },
      immutable: true,
    });
  } catch (err) {
    console.error("INVOICE FETCH ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch invoice" });
  }
};

/* ======================================================
   GET INVOICE LIST (ROLE SAFE)
====================================================== */
const getInvoiceList = async (req, res) => {
  try {
    const user = req.user;

    let queryText;

    /* ---------- VENDOR → OPEN DAY ONLY ---------- */
    if (user.role === "vendor") {
      queryText = `
        SELECT
          s.invoice_id,
          d.business_date,
          c.name AS customer_name,
          SUM(s.amount) AS total_amount
        FROM sales s
        JOIN day_status d ON d.id = s.day_id
        JOIN customers c ON c.id = s.customer_id
        WHERE d.status = 'OPEN'
        GROUP BY s.invoice_id, d.business_date, c.name
        ORDER BY s.invoice_id DESC
      `;
    }

    /* ---------- ADMIN / SUPER ADMIN ---------- */
    else {
      queryText = `
        SELECT
          s.invoice_id,
          d.business_date,
          c.name AS customer_name,
          SUM(s.amount) AS total_amount
        FROM sales s
        JOIN day_status d ON d.id = s.day_id
        JOIN customers c ON c.id = s.customer_id
        GROUP BY s.invoice_id, d.business_date, c.name
        ORDER BY s.invoice_id DESC
      `;
    }

    const result = await query(queryText);

    return res.status(200).json({
      invoices: result.rows.map(row => ({
        invoice_id: row.invoice_id,
        business_date: row.business_date,
        customer_name: row.customer_name,
        total_amount: Number(row.total_amount),
      })),
    });
  } catch (err) {
    console.error("INVOICE LIST ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch invoices" });
  }
};

module.exports = {
  getInvoiceById,
  getInvoiceList,
};