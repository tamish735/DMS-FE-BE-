const { query } = require("../config/db");

const clearCustomerDue = async (req, res) => {
  try {
    const { customer_id, amount, mode } = req.body;

    if (!customer_id || !amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid input" });
    }

    if (!["cash", "online"].includes(mode)) {
      return res.status(400).json({ message: "Invalid payment mode" });
    }

    /* =========================
       START TRANSACTION
    ========================= */
    await query("BEGIN");

    // Get latest OPEN or CLOSED day (ledger requires a day_id)
    const dayResult = await query(
      `
      SELECT id, business_date
      FROM day_status
      ORDER BY id DESC
      LIMIT 1
      `
    );

    if (dayResult.rows.length === 0) {
      await query("ROLLBACK");
      return res.status(400).json({ message: "No business day found" });
    }

    const day = dayResult.rows[0];

    /* =========================
       INSERT PAYMENT
    ========================= */
    const paymentResult = await query(
      `
      INSERT INTO payments (day_id, customer_id, mode, amount)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
      [day.id, customer_id, mode, amount]
    );

    /* =========================
       LEDGER EVENT
    ========================= */
    await query(
      `
      INSERT INTO ledger_events
        (day_id, business_date, event_type, customer_id, amount, payment_mode, reference_id, reference_table, notes)
      VALUES
        ($1, $2, 'PAYMENT', $3, $4, $5, $6, 'payments', 'Due clearance')
      `,
      [
        day.id,
        day.business_date,
        customer_id,
        amount,
        mode,
        paymentResult.rows[0].id,
      ]
    );

    /* =========================
       CALCULATE UPDATED DUE
    ========================= */
    const ledgerSum = await query(
      `
      SELECT COALESCE(
        SUM(
          CASE
            WHEN event_type = 'SALE' THEN amount
            WHEN event_type = 'PAYMENT' THEN -amount
          END
        ), 0
      ) AS balance
      FROM ledger_events
      WHERE customer_id = $1
      `,
      [customer_id]
    );

    await query("COMMIT");

    return res.status(200).json({
      message: "Due cleared successfully",
      paid: Number(amount),
      new_due: Number(ledgerSum.rows[0].balance),
    });
  } catch (err) {
    await query("ROLLBACK");
    console.error("CLEAR DUE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { clearCustomerDue };