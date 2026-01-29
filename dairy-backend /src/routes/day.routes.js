const express = require("express");
const router = express.Router();

const { query } = require("../config/db");
const { openDay, closeDay, lockDay } = require("../controllers/day.controller");

const authMiddleware = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

/**
 * GET /status
 * Anyone authenticated can view day status
 */
router.get("/status", authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const result = await query(
      `
      SELECT business_date, status
      FROM day_status
      WHERE business_date = $1
      LIMIT 1
      `,
      [today]
    );

    // ✅ No record for today → allow Open Day
    if (result.rows.length === 0) {
      return res.json({
        status: "CLOSED",
        hasDayRecord: false,
      });
    }

    // ✅ Record exists for today
    return res.json({
      status: result.rows[0].status,
      business_date: result.rows[0].business_date,
      hasDayRecord: true,
    });
  } catch (err) {
    console.error("DAY STATUS ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /day/open
 * Admin and above
 */
router.post(
  "/day/open",
  authMiddleware,
  requireRole("admin", "super_admin"),
  openDay
);

/**
 * POST /day/close
 * Admin and above
 */
router.post(
  "/day/close",
  authMiddleware,
  requireRole("admin", "super_admin"),
  closeDay
);

/**
 * POST /day/lock
 * Admin and above
 */
router.post(
  "/day/lock",
  authMiddleware,
  requireRole("admin", "super_admin"),
  lockDay
);

module.exports = router;


// const express = require("express");
// const router = express.Router();

// const { query } = require("../config/db");

// const { openDay, closeDay, lockDay } = require("../controllers/day.controller");

// const authMiddleware = require("../middleware/auth.middleware");
// const { requireRole } = require("../middleware/role.middleware");

// /**
//  * GET /status
//  * Anyone authenticated can view day status
//  */
// router.get("/status", authMiddleware, async (req, res) => {
//   try {
//     const today = new Date().toISOString().split("T")[0];

//     const result = await query(`
//   SELECT business_date, status
//   FROM day_status
//   ORDER BY business_date DESC
//   LIMIT 1
// `);

//     // const result = await query(
//     //   "SELECT status FROM day_status WHERE business_date = $1",
//     //   [today]
//     // );

//     // No record for today → day not started yet
//     if (result.rows.length === 0) {
//       return res.json({
//         status: "CLOSED",
//         hasDayRecord: false,
//       });
//     }

//     // Record exists for today
//     return res.json({
//       status: result.rows[0]?.status || "NO_DAY",
//       business_date: result.rows[0]?.business_date || null,
//       hasDayRecord: true,
//     });

//     // res.json({
//     //   status: result.rows[0].status,
//     //   hasDayRecord: true,
//     // });
//   } catch (err) {
//     console.error("DAY STATUS ERROR:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// });

// /**
//  * POST /day/open
//  * Admin and above only
//  */
// router.post(
//   "/day/open",
//   authMiddleware,
//   requireRole("admin"),
//   openDay
// );

// /**
//  * POST /day/close
//  * Admin and above only
//  */
// router.post(
//   "/day/close",
//   authMiddleware,
//   requireRole("admin"),
//   closeDay
// );

// /**
//  * POST /day/lock
//  * Admin and above only
//  */
// router.post(
//   "/day/lock",
//   authMiddleware,
//   requireRole("admin"),
//   lockDay
// );

// module.exports = router;