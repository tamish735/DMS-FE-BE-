const express = require("express");
const router = express.Router();
const { query } = require("../config/db");
const authMiddleware = require("../middleware/auth.middleware");

router.get("/summary/customer", authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    /* 1️⃣ Total customers */
    const totalCustomersResult = await query(
      `SELECT COUNT(*) FROM customers`
    );

    /* 2️⃣ Ledger balance per customer */
    const balancesResult = await query(`
      SELECT
        customer_id,
        SUM(
          CASE
            WHEN type = 'SALE' THEN debit
            WHEN type = 'PAYMENT' THEN -credit
            ELSE 0
          END
        ) AS balance
      FROM ledger
      GROUP BY customer_id
    `);

    let customersWithDue = 0;
    let totalDueAmount = 0;

    balancesResult.rows.forEach(row => {
      const balance = Number(row.balance || 0);
      if (balance > 0) {
        customersWithDue += 1;
        totalDueAmount += balance;
      }
    });

    /* 3️⃣ Customers who paid today */
    const paidTodayResult = await query(
      `
      SELECT
        COUNT(DISTINCT customer_id) AS customers_paid_today,
        COALESCE(SUM(credit), 0) AS amount_collected_today
      FROM ledger
      WHERE type = 'PAYMENT'
        AND DATE(created_at) = $1
      `,
      [today]
    );

    return res.json({
      totalCustomers: Number(totalCustomersResult.rows[0].count),
      customersWithDue,
      totalDueAmount,
      customersPaidToday: Number(
        paidTodayResult.rows[0].customers_paid_today
      ),
      amountCollectedToday: Number(
        paidTodayResult.rows[0].amount_collected_today
      ),
    });
  } catch (err) {
    console.error("CUSTOMER SUMMARY ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;