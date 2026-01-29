const { query } = require("../config/db");
const { getFinalProductPrice } = require("../utils/pricing");
const { logAudit } = require("../utils/auditLogger");

/* =======================
   QUICK BILLING
======================= */
const quickBilling = async (req, res) => {
  await query("BEGIN");

  try {
    const user = req.user;
    const { customer_id, items = [], payment = {} } = req.body;

    if (!customer_id || !Array.isArray(items)) {
      await query("ROLLBACK");
      return res.status(400).json({ message: "Invalid billing data" });
    }

    /* ---------- OPEN DAY ---------- */
    const dayRes = await query(
      `SELECT id, business_date FROM day_status WHERE status = 'OPEN' LIMIT 1`
    );

    if (dayRes.rows.length === 0) {
      await query("ROLLBACK");
      return res.status(400).json({ message: "No OPEN day found" });
    }

    const day = dayRes.rows[0];

    if (items.length === 0 && !payment.cash && !payment.online) {
      await query("ROLLBACK");
      return res.status(400).json({
        message: "Billing must contain items or payment",
      });
    }

    /* ---------- INVOICE ID ---------- */
    const dateStr = day.business_date
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "");

    const invoiceCountRes = await query(
      `SELECT COUNT(*) AS count FROM invoices WHERE day_id = $1`,
      [day.id]
    );

    const nextNumber = Number(invoiceCountRes.rows[0].count) + 1;
    const invoiceId = `INV-${dateStr}-${String(nextNumber).padStart(4, "0")}`;

    let subtotal = 0;

    /* ---------- CREATE INVOICE ---------- */
    await query(
      `
      INSERT INTO invoices
        (invoice_id, day_id, customer_id, business_date, created_by,
         subtotal, cash_paid, online_paid, total_paid, due)
      VALUES ($1,$2,$3,$4,$5,0,0,0,0,0)
      `,
      [invoiceId, day.id, customer_id, day.business_date, user?.id || null]
    );

    /* ---------- SALES + LEDGER ---------- */
    for (const item of items) {
      if (!item.product_id || item.quantity <= 0) {
        await query("ROLLBACK");
        return res.status(400).json({ message: "Invalid item data" });
      }

      const stockRes = await query(
        `
        SELECT plant_load_qty
        FROM daily_product_stock
        WHERE day_id = $1 AND product_id = $2
        `,
        [day.id, item.product_id]
      );

      const plantLoad = stockRes.rows[0]?.plant_load_qty ?? 0;

      const soldRes = await query(
        `
        SELECT COALESCE(SUM(quantity),0) AS sold
        FROM sales
        WHERE day_id = $1 AND product_id = $2
        `,
        [day.id, item.product_id]
      );

      const soldQty = Number(soldRes.rows[0].sold);
      const available = plantLoad - soldQty;

      if (item.quantity > available) {
        await query("ROLLBACK");
        return res.status(400).json({
          message: "Insufficient stock",
          product_id: item.product_id,
          available_stock: available,
        });
      }

      const rate = await getFinalProductPrice(customer_id, item.product_id);
      const amount = rate * item.quantity;
      subtotal += amount;

      const saleRes = await query(
        `
        INSERT INTO sales
          (day_id, customer_id, product_id, quantity, rate, amount, invoice_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id
        `,
        [
          day.id,
          customer_id,
          item.product_id,
          item.quantity,
          rate,
          amount,
          invoiceId,
        ]
      );

      await query(
        `
        INSERT INTO ledger_events
          (day_id, business_date, event_type, customer_id,
           product_id, quantity, amount,
           reference_id, reference_table, invoice_id)
        VALUES ($1,$2,'SALE',$3,$4,$5,$6,$7,'sales',$8)
        `,
        [
          day.id,
          day.business_date,
          customer_id,
          item.product_id,
          item.quantity,
          amount,
          saleRes.rows[0].id,
          invoiceId,
        ]
      );
    }

    /* ---------- PAYMENTS ---------- */
    const cash = Number(payment.cash || 0);
    const online = Number(payment.online || 0);
    const totalPaid = cash + online;
    const due = subtotal - totalPaid;

    if (cash > 0) {
      const payRes = await query(
        `
        INSERT INTO payments
          (day_id, customer_id, mode, amount, invoice_id)
        VALUES ($1,$2,'cash',$3,$4)
        RETURNING id
        `,
        [day.id, customer_id, cash, invoiceId]
      );

      await query(
        `
        INSERT INTO ledger_events
          (day_id, business_date, event_type, customer_id,
           amount, payment_mode,
           reference_id, reference_table, invoice_id)
        VALUES ($1,$2,'PAYMENT',$3,$4,'cash',$5,'payments',$6)
        `,
        [
          day.id,
          day.business_date,
          customer_id,
          cash,
          payRes.rows[0].id,
          invoiceId,
        ]
      );
    }

    if (online > 0) {
      const payRes = await query(
        `
        INSERT INTO payments
          (day_id, customer_id, mode, amount, invoice_id)
        VALUES ($1,$2,'online',$3,$4)
        RETURNING id
        `,
        [day.id, customer_id, online, invoiceId]
      );

      await query(
        `
        INSERT INTO ledger_events
          (day_id, business_date, event_type, customer_id,
           amount, payment_mode,
           reference_id, reference_table, invoice_id)
        VALUES ($1,$2,'PAYMENT',$3,$4,'online',$5,'payments',$6)
        `,
        [
          day.id,
          day.business_date,
          customer_id,
          online,
          payRes.rows[0].id,
          invoiceId,
        ]
      );
    }

    /* ---------- FINALIZE INVOICE ---------- */
    await query(
      `
      UPDATE invoices
      SET subtotal = $1,
          cash_paid = $2,
          online_paid = $3,
          total_paid = $4,
          due = $5
      WHERE invoice_id = $6
      `,
      [subtotal, cash, online, totalPaid, due, invoiceId]
    );

    await query("COMMIT");

    /* ---------- AUDIT (SAFE) ---------- */
    logAudit({
      user,
      action: "CREATE_INVOICE",
      entity: "invoice",
      entity_id: invoiceId,
      details: {
        customer_id,
        total_amount: subtotal,
        cash_paid: cash,
        online_paid: online,
        due,
      },
    });

    return res.json({
      message: "Billing successful",
      invoice_id: invoiceId,
      total_amount: subtotal,
      paid: totalPaid,
      due,
    });
  } catch (err) {
    await query("ROLLBACK");
    console.error("BILLING ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { quickBilling };