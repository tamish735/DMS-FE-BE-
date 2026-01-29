const { query } = require("../config/db");

/* ======================================================
   POST /stock/daily
   DAILY STOCK (FINAL, STRICT, PER PRODUCT)
====================================================== */
const upsertDailyProductStock = async (req, res) => {
  const user = req.user;

  if (!["admin", "super_admin"].includes(user.role)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const {
    product_id,
    plant_load_qty,
    counter_opening_qty,
    counter_closing_qty,
    returned_to_plant_qty,
  } = req.body;

  if (!product_id) {
    return res.status(400).json({ message: "product_id is required" });
  }

  try {
    /* =========================
       GET OPEN DAY
    ========================= */
    const dayRes = await query(`
      SELECT id, business_date
      FROM day_status
      WHERE status = 'OPEN'
      LIMIT 1
    `);

    if (!dayRes.rows.length) {
      return res.status(400).json({ message: "No OPEN day found" });
    }

    const dayId = dayRes.rows[0].id;
    const today = dayRes.rows[0].business_date;

    /* =========================
       YESTERDAY CLOSING (PER PRODUCT)
    ========================= */
    const prevRes = await query(
      `
      SELECT dps.counter_closing_qty
      FROM daily_product_stock dps
      JOIN day_status ds ON ds.id = dps.day_id
      WHERE ds.status = 'CLOSED'
        AND ds.business_date < $1
        AND dps.product_id = $2
      ORDER BY ds.business_date DESC
      LIMIT 1
      `,
      [today, product_id]
    );

    const prevCounterClosing = prevRes.rows.length
      ? Number(prevRes.rows[0].counter_closing_qty)
      : 0;

    await query("BEGIN");

    /* =========================
       LOCK TODAY ROW (PER PRODUCT)
    ========================= */
    const rowRes = await query(
      `
      SELECT *
      FROM daily_product_stock
      WHERE day_id = $1 AND product_id = $2
      FOR UPDATE
      `,
      [dayId, product_id]
    );

    const row = rowRes.rows[0] || null;

    const morningComplete =
      row &&
      row.plant_load_qty !== null &&
      row.counter_opening_qty !== null;

    const closingComplete =
      row &&
      row.counter_closing_qty !== null &&
      row.returned_to_plant_qty !== null;

    const isMorningRequest =
      plant_load_qty !== undefined &&
      counter_opening_qty !== undefined &&
      counter_closing_qty === undefined &&
      returned_to_plant_qty === undefined;

    const isClosingRequest =
      counter_closing_qty !== undefined &&
      returned_to_plant_qty !== undefined &&
      plant_load_qty === undefined &&
      counter_opening_qty === undefined;

    /* =========================
       MORNING ENTRY
    ========================= */
    if (isMorningRequest) {
      if (morningComplete) {
        await query("ROLLBACK");
        return res.status(400).json({
          message: "Morning stock already completed for this product",
        });
      }

      const plantLoad = Number(plant_load_qty);
      const counterOpening = Number(counter_opening_qty);

      if ([plantLoad, counterOpening].some(v => isNaN(v) || v < 0)) {
        await query("ROLLBACK");
        return res.status(400).json({
          message: "Invalid morning quantities",
        });
      }

      if (counterOpening > plantLoad + prevCounterClosing) {
        await query("ROLLBACK");
        return res.status(400).json({
          message: "Counter opening exceeds total opening stock",
        });
      }

      if (row) {
        await query(
          `
          UPDATE daily_product_stock
          SET
            plant_load_qty = $1,
            counter_opening_qty = $2,
            entered_by = $3,
            updated_at = CURRENT_TIMESTAMP
          WHERE day_id = $4 AND product_id = $5
          `,
          [plantLoad, counterOpening, user.id, dayId, product_id]
        );
      } else {
        await query(
          `
          INSERT INTO daily_product_stock
            (day_id, product_id, plant_load_qty, counter_opening_qty, entered_by)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [dayId, product_id, plantLoad, counterOpening, user.id]
        );
      }

      await query("COMMIT");
      return res.json({ message: "Morning stock saved and locked" });
    }

    /* =========================
       CLOSING ENTRY
    ========================= */
    if (isClosingRequest) {
      if (!morningComplete) {
        await query("ROLLBACK");
        return res.status(400).json({
          message: "Morning stock not completed for this product",
        });
      }

      if (closingComplete) {
        await query("ROLLBACK");
        return res.status(400).json({
          message: "Closing stock already completed for this product",
        });
      }

      const counterClosing = Number(counter_closing_qty);
      const returned = Number(returned_to_plant_qty);

      if ([counterClosing, returned].some(v => isNaN(v) || v < 0)) {
        await query("ROLLBACK");
        return res.status(400).json({
          message: "Invalid closing quantities",
        });
      }

      await query(
        `
        UPDATE daily_product_stock
        SET
          counter_closing_qty = $1,
          returned_to_plant_qty = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE day_id = $3 AND product_id = $4
        `,
        [counterClosing, returned, dayId, product_id]
      );

      await query("COMMIT");
      return res.json({ message: "Closing stock saved and locked" });
    }

    await query("ROLLBACK");
    return res.status(400).json({ message: "Invalid stock submission" });
  } catch (err) {
    await query("ROLLBACK");
    console.error("DAILY STOCK ERROR:", err);
    return res.status(500).json({
      message: "Failed to save daily product stock",
    });
  }
};

/* ======================================================
   GET /stock/daily
   DAILY STOCK FOR UI
====================================================== */
const getDailyProductStock = async (req, res) => {
  try {
    const dayRes = await query(`
      SELECT id, business_date
      FROM day_status
      WHERE status = 'OPEN'
      LIMIT 1
    `);

    if (!dayRes.rows.length) {
      return res.status(400).json({ message: "No OPEN day found" });
    }

    const day = dayRes.rows[0];

    const result = await query(
      `
      SELECT
        p.id AS product_id,
        p.name AS product_name,

        s.plant_load_qty,
        s.counter_opening_qty,
        s.counter_closing_qty,
        s.returned_to_plant_qty,

        COALESCE(prev.counter_closing_qty, 0) AS yesterday_counter_closing

      FROM products p

      LEFT JOIN daily_product_stock s
        ON s.product_id = p.id
       AND s.day_id = $1

      LEFT JOIN daily_product_stock prev
        ON prev.product_id = p.id
       AND prev.day_id = (
         SELECT id FROM day_status
         WHERE status = 'CLOSED'
         ORDER BY business_date DESC
         LIMIT 1
       )

      ORDER BY p.id
      `,
      [day.id]
    );

    return res.json({
      day_id: day.id,
      business_date: day.business_date,
      stocks: result.rows,
    });
  } catch (err) {
    console.error("FETCH DAILY STOCK ERROR:", err);
    return res.status(500).json({
      message: "Failed to fetch daily stock",
    });
  }
};

module.exports = {
  upsertDailyProductStock,
  getDailyProductStock,
};