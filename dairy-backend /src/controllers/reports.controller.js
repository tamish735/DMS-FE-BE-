const { Parser } = require("json2csv");
const { query } = require("../config/db");
const PDFDocument = require("pdfkit");

/* ======================================================
   HELPER: SAFE DATE RANGE (NO UTC, NO MISSING DAYS)
====================================================== */
const getDateRange = ({ month, from, to }) => {
  if (from && to) {
    return { fromDate: from, toDate: to };
  }

  if (!month) {
    throw new Error("month or from/to required");
  }

  const [year, m] = month.split("-").map(Number);

  // Month start: YYYY-MM-01
  const fromDate = `${year}-${String(m).padStart(2, "0")}-01`;

  // Month end: last day of month (handles 28/29/30/31 automatically)
  const lastDay = new Date(year, m, 0).getDate();
  const toDate = `${year}-${String(m).padStart(2, "0")}-${lastDay}`;

  return { fromDate, toDate };
};

/* ======================================================
   JSON LEDGER REPORT
====================================================== */
const getCustomerLedgerReport = async (req, res) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) {
      return res.status(400).json({ message: "customer_id is required" });
    }

    const { fromDate, toDate } = getDateRange(req.query);

    /* ---------- CUSTOMER INFO ---------- */
    const customerRes = await query(
      `SELECT name, phone FROM customers WHERE id = $1`,
      [customer_id]
    );
    const customer = customerRes.rows[0] || {};

    /* ---------- OPENING BALANCE ---------- */
    const openingRes = await query(
      `
      SELECT COALESCE(SUM(
        CASE
          WHEN event_type = 'SALE' THEN amount
          WHEN event_type = 'PAYMENT' THEN -amount
          ELSE 0
        END
      ), 0) AS opening
      FROM ledger_events
      WHERE customer_id = $1
        AND business_date < $2
      `,
      [customer_id, fromDate]
    );

    let runningBalance = Number(openingRes.rows[0].opening || 0);
    let totalSales = 0;
    let totalPayments = 0;

    /* ---------- LEDGER ROWS ---------- */
    const ledgerRes = await query(
      `
      SELECT
        le.created_at,
        le.event_type,
        le.quantity,
        le.amount,
        p.name AS product_name
      FROM ledger_events le
      LEFT JOIN products p ON p.id = le.product_id
      WHERE le.customer_id = $1
        AND le.business_date BETWEEN $2 AND $3
      ORDER BY le.business_date, le.created_at
      `,
      [customer_id, fromDate, toDate]
    );

    const rows = ledgerRes.rows.map((r) => {
      const amt = Number(r.amount || 0);
      let debit = null;
      let credit = null;

      if (r.event_type === "SALE") {
        debit = amt;
        runningBalance += amt;
        totalSales += amt;
      } else {
        credit = amt;
        runningBalance -= amt;
        totalPayments += amt;
      }

      return {
        date: r.created_at,
        type: r.event_type,
        product: r.product_name || "",
        quantity: r.quantity,
        debit,
        credit,
        balance: Number(runningBalance.toFixed(2)),
      };
    });

    /* ---------- PRODUCT SUMMARY ---------- */
    const productSummaryRes = await query(
      `
      SELECT
        p.name AS product_name,
        SUM(le.quantity) AS total_quantity,
        SUM(le.amount) AS total_amount
      FROM ledger_events le
      JOIN products p ON p.id = le.product_id
      WHERE le.customer_id = $1
        AND le.event_type = 'SALE'
        AND le.business_date BETWEEN $2 AND $3
      GROUP BY p.name
      ORDER BY p.name
      `,
      [customer_id, fromDate, toDate]
    );

    return res.json({
      customer,
      period: { from: fromDate, to: toDate },
      summary: {
        total_sales: Number(totalSales.toFixed(2)),
        total_payments: Number(totalPayments.toFixed(2)),
        closing_balance: Number(runningBalance.toFixed(2)),
      },
      product_summary: productSummaryRes.rows,
      rows,
    });
  } catch (err) {
    console.error("LEDGER JSON ERROR:", err);
    return res.status(500).json({ message: "Ledger fetch failed" });
  }
};

/* ======================================================
   CSV EXPORT
====================================================== */
const exportCustomerLedgerCSV = async (req, res) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) {
      return res.status(400).send("customer_id is required");
    }

    const { fromDate, toDate } = getDateRange(req.query);

    const productSummaryRes = await query(
      `
      SELECT
        p.name AS product_name,
        SUM(le.quantity) AS total_quantity,
        SUM(le.amount) AS total_amount
      FROM ledger_events le
      JOIN products p ON p.id = le.product_id
      WHERE le.customer_id = $1
        AND le.event_type = 'SALE'
        AND le.business_date BETWEEN $2 AND $3
      GROUP BY p.name
      ORDER BY p.name
      `,
      [customer_id, fromDate, toDate]
    );

    const csv = new Parser({
      fields: ["product_name", "total_quantity", "total_amount"],
    }).parse(productSummaryRes.rows);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=product_summary_${customer_id}_${fromDate}_to_${toDate}.csv`
    );

    res.send(csv);
  } catch (err) {
    console.error("CSV EXPORT ERROR:", err);
    res.status(500).send("CSV export failed");
  }
};

/* ======================================================
   PDF EXPORT
====================================================== */
const exportCustomerLedgerPDF = async (req, res) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) {
      return res.status(400).send("customer_id is required");
    }

    const { fromDate, toDate } = getDateRange(req.query);

    const productSummaryRes = await query(
      `
      SELECT
        p.name AS product_name,
        SUM(le.quantity) AS total_quantity,
        SUM(le.amount) AS total_amount
      FROM ledger_events le
      JOIN products p ON p.id = le.product_id
      WHERE le.customer_id = $1
        AND le.event_type = 'SALE'
        AND le.business_date BETWEEN $2 AND $3
      GROUP BY p.name
      ORDER BY p.name
      `,
      [customer_id, fromDate, toDate]
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=product_summary_${customer_id}_${fromDate}_to_${toDate}.pdf`
    );

    doc.pipe(res);

    doc.fontSize(16).text("Product-wise Sales Summary", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Period: ${fromDate} to ${toDate}`);
    doc.moveDown();

    const col = { p: 40, q: 300, a: 420 };

    doc.fontSize(10)
      .text("Product", col.p)
      .text("Quantity", col.q, undefined, { align: "right", width: 80 })
      .text("Amount", col.a, undefined, { align: "right", width: 80 });

    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    productSummaryRes.rows.forEach((r) => {
      doc.text(r.product_name, col.p);
      doc.text(r.total_quantity, col.q, doc.y, { align: "right", width: 80 });
      doc.text(Number(r.total_amount).toFixed(2), col.a, doc.y, {
        align: "right",
        width: 80,
      });
      doc.moveDown(0.4);
    });

    doc.end();
  } catch (err) {
    console.error("PDF EXPORT ERROR:", err);
    res.status(500).send("PDF export failed");
  }
};

module.exports = {
  getCustomerLedgerReport,
  exportCustomerLedgerCSV,
  exportCustomerLedgerPDF,
};


