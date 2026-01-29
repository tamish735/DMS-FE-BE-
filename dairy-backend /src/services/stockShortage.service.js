const { query } = require("../config/db");

const getStockShortagesForDay = async (dayId) => {
  const result = await query(
    `
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      d.plant_load_qty,
      COALESCE(SUM(s.quantity), 0) AS sold_qty,
      d.counter_closing_qty,
      d.returned_to_plant_qty,
      (
        d.plant_load_qty
        - COALESCE(SUM(s.quantity), 0)
        - d.counter_closing_qty
        - d.returned_to_plant_qty
      ) AS shortage
    FROM daily_product_stock d
    JOIN products p ON p.id = d.product_id
    LEFT JOIN sales s
      ON s.product_id = d.product_id
     AND s.day_id = d.day_id
    WHERE d.day_id = $1
    GROUP BY p.id, d.plant_load_qty, d.counter_closing_qty, d.returned_to_plant_qty
    HAVING (
      d.plant_load_qty
      - COALESCE(SUM(s.quantity), 0)
      - d.counter_closing_qty
      - d.returned_to_plant_qty
    ) > 0
    `,
    [dayId]
  );

  return result.rows;
};

const getUnjustifiedShortages = async (dayId) => {
  const result = await query(
    `
    SELECT s.*
    FROM (
      SELECT
        d.product_id,
        (
          d.plant_load_qty
          - COALESCE(SUM(s.quantity), 0)
          - d.counter_closing_qty
          - d.returned_to_plant_qty
        ) AS shortage
      FROM daily_product_stock d
      LEFT JOIN sales s
        ON s.product_id = d.product_id
       AND s.day_id = d.day_id
      WHERE d.day_id = $1
      GROUP BY d.product_id, d.plant_load_qty, d.counter_closing_qty, d.returned_to_plant_qty
    ) s
    LEFT JOIN stock_shortage_reasons r
      ON r.day_id = $1
     AND r.product_id = s.product_id
    WHERE s.shortage > 0
      AND r.id IS NULL
    `,
    [dayId]
  );

  return result.rows;
};

module.exports = {
  getStockShortagesForDay,
  getUnjustifiedShortages,
};