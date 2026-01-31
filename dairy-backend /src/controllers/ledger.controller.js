const { query } = require("../config/db");

const getCustomerLedger = async (req, res) => {
  try {
    const customerId = Number(req.params.customer_id);

    if (!customerId) {
      return res.status(400).json({ message: "Invalid customer id" });
    }

    const eventsResult = await query(
      `
      SELECT
        business_date,
        event_type,
        quantity,
        amount,
        payment_mode,
        notes,
        created_at
      FROM ledger_events
      WHERE customer_id = $1
      ORDER BY business_date, created_at
      `,
      [customerId]
    );

    if (eventsResult.rows.length === 0) {
      return res.json({
        customer_id: customerId,
        ledger: [],
      });
    }

    let runningBalance = 0;

    const ledger = eventsResult.rows.map(event => {
      let debit = null;
      let credit = null;

      if (event.event_type === "SALE") {
        debit = Number(event.amount);
        runningBalance += debit;
      }

      if (event.event_type === "PAYMENT") {
        credit = Number(event.amount);
        runningBalance -= credit;
      }

      return {
        date: event.created_at,
        type: event.event_type,               // SALE / PAYMENT
        payment_mode: event.payment_mode,     // cash / online / null
        debit,
        credit,
        balance: Number(runningBalance.toFixed(2)),
        notes: event.notes,
      };
    });

    return res.json({
      customer_id: customerId,
      ledger,
    });

  } catch (err) {
    console.error("LEDGER EVENTS ERROR:", err);
    return res.status(500).json({
      message: "Failed to fetch ledger",
    });
  }
};

module.exports = {
  getCustomerLedger,
};
