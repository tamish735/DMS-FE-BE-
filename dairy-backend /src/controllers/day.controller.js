const { query } = require("../config/db");

/* =========================
   GET DAY STATUS
========================= */
const getDayStatus = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const result = await query(
      `
      SELECT status
      FROM day_status
      WHERE business_date = $1
      LIMIT 1
      `,
      [today]
    );

    if (result.rows.length === 0) {
      return res.json({
        status: "CLOSED",
        hasDayRecord: false,
      });
    }

    return res.json({
      status: result.rows[0].status,
      hasDayRecord: true,
    });
  } catch (err) {
    console.error("FETCH DAY STATUS ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   OPEN DAY (SCHEMA-CORRECT)
========================= */
const openDay = async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  try {
    await query("BEGIN");

    /* 1️⃣ Check if day already exists */
    const existing = await query(
      `SELECT id FROM day_status WHERE business_date = $1`,
      [today]
    );

    if (existing.rows.length > 0) {
      await query("ROLLBACK");
      return res.status(400).json({
        message: "Day already exists for today",
      });
    }

    /* 2️⃣ Create day */
    await query(
      `
      INSERT INTO day_status (business_date, status)
      VALUES ($1, 'OPEN')
      `,
      [today]
    );

    /* 3️⃣ Get yesterday date */
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split("T")[0];

    /* 4️⃣ Populate customer balances */
    const customers = await query(`SELECT id FROM customers`);

    for (const c of customers.rows) {
      let openingBalance = 0;

      const prev = await query(
        `
        SELECT closing_balance
        FROM customer_daily_balance
        WHERE customer_id = $1 AND business_date = $2
        `,
        [c.id, yesterdayDate]
      );

      if (prev.rows.length) {
        openingBalance = Number(prev.rows[0].closing_balance);
      }

      await query(
        `
        INSERT INTO customer_daily_balance
          (business_date, customer_id, opening_balance, closing_balance)
        VALUES ($1, $2, $3, $3)
        ON CONFLICT (business_date, customer_id) DO NOTHING
        `,
        [today, c.id, openingBalance]
      );
    }

    await query("COMMIT");

    return res.status(200).json({
      message: "Day opened successfully",
    });
  } catch (err) {
    await query("ROLLBACK");
    console.error("OPEN DAY ERROR:", err);
    return res.status(500).json({
      message: "Failed to open day",
    });
  }
};

/* =========================
   CLOSE DAY
========================= */
const closeDay = async (req, res) => {
  try {
    const dayResult = await query(
      `
      SELECT id
      FROM day_status
      WHERE status = 'OPEN'
      ORDER BY id DESC
      LIMIT 1
      `
    );

    if (dayResult.rows.length === 0) {
      return res.status(400).json({ message: "No open day to close" });
    }

    const dayId = dayResult.rows[0].id;

    const stockRows = await query(
      `
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        d.plant_load_qty,
        d.counter_closing_qty,
        d.returned_to_plant_qty,
        COALESCE(SUM(s.quantity), 0) AS sold_qty
      FROM products p
      LEFT JOIN daily_product_stock d
        ON d.product_id = p.id AND d.day_id = $1
      LEFT JOIN sales s
        ON s.product_id = p.id AND s.day_id = $1
      GROUP BY
        p.id, p.name,
        d.plant_load_qty,
        d.counter_closing_qty,
        d.returned_to_plant_qty
      ORDER BY p.id
      `,
      [dayId]
    );

    const incomplete = [];
    const shortages = [];

    for (const row of stockRows.rows) {
      const {
        product_id,
        product_name,
        plant_load_qty,
        counter_closing_qty,
        returned_to_plant_qty,
        sold_qty,
      } = row;

      if (
        plant_load_qty === null ||
        counter_closing_qty === null ||
        returned_to_plant_qty === null
      ) {
        incomplete.push({ product_id, product_name });
        continue;
      }

      const shortage =
        Number(plant_load_qty) -
        Number(sold_qty) -
        Number(counter_closing_qty) -
        Number(returned_to_plant_qty);

      if (shortage !== 0) {
        shortages.push({ product_id, product_name, shortage });
      }
    }

    if (incomplete.length > 0) {
      return res.status(400).json({
        reason: "INCOMPLETE_STOCK",
        products: incomplete,
      });
    }

    if (shortages.length > 0) {
      return res.status(400).json({
        reason: "JUSTIFICATION_REQUIRED",
        products: shortages,
      });
    }

    await query(
      `
      UPDATE day_status
      SET status = 'CLOSED',
          closed_at = NOW()
      WHERE id = $1
      `,
      [dayId]
    );

    return res.status(200).json({
      message: "Day closed successfully",
    });
  } catch (err) {
    console.error("CLOSE DAY ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   LOCK DAY
========================= */
const lockDay = async (req, res) => {
  try {
    const result = await query(
      `
      SELECT id
      FROM day_status
      WHERE status = 'CLOSED'
      ORDER BY id DESC
      LIMIT 1
      `
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "No closed day to lock",
      });
    }

    await query(
      `
      UPDATE day_status
      SET status = 'LOCKED',
          locked_at = NOW()
      WHERE id = $1
      `,
      [result.rows[0].id]
    );

    return res.status(200).json({
      message: "Day locked successfully",
    });
  } catch (err) {
    console.error("LOCK DAY ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getDayStatus,
  openDay,
  closeDay,
  lockDay,
};