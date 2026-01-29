const { query } = require("../config/db");

const getCustomerSummary = async (req, res) => {
  try {
    // 1️⃣ Customers billed today
    const billedResult = await query(`
      SELECT COUNT(DISTINCT customer_id) AS billed_today
      FROM sales
      WHERE business_date = CURRENT_DATE
    `);

    // 2️⃣ Customers with due
    const dueCustomersResult = await query(`
      SELECT COUNT(*) AS customers_with_due
      FROM (
        SELECT customer_id, MAX(balance) AS balance
        FROM ledger
        GROUP BY customer_id
      ) t
      WHERE balance > 0
    `);

    // 3️⃣ Total due amount
    const totalDueResult = await query(`
      SELECT COALESCE(SUM(balance), 0) AS total_due
      FROM (
        SELECT customer_id, MAX(balance) AS balance
        FROM ledger
        GROUP BY customer_id
      ) t
      WHERE balance > 0
    `);

    res.json({
      billed_today: Number(billedResult.rows[0].billed_today),
      customers_with_due: Number(dueCustomersResult.rows[0].customers_with_due),
      total_due: Number(totalDueResult.rows[0].total_due),
    });
  } catch (err) {
    console.error("CUSTOMER SUMMARY ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getCustomerSummary };