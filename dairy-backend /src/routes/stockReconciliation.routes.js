const express = require("express");
const router = express.Router();

const { requireRole } = require("../middleware/role.middleware");

const {
  getStockReconciliation,
} = require("../controllers/stockReconciliation.controller");

const authMiddleware = require("../middleware/auth.middleware");

router.get(
  "/stock/reconciliation",
  authMiddleware,
  requireRole("admin"),
  getStockReconciliation
);

module.exports = router;