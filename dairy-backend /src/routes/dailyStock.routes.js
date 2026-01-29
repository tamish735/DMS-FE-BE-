


const express = require("express");
const router = express.Router();

const {
  upsertDailyProductStock,
  getDailyProductStock,
} = require("../controllers/dailyStock.controller");

const authMiddleware = require("../middleware/auth.middleware");

/* =========================
   DAILY STOCK
========================= */

// GET daily stock (UI)
router.get(
  "/stock/daily",
  authMiddleware,
  getDailyProductStock
);

// POST morning / closing stock
router.post(
  "/stock/daily",
  authMiddleware,
  upsertDailyProductStock
);

module.exports = router;