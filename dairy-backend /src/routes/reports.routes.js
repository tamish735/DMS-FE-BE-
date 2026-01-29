const express = require("express");
const router = express.Router();

const {
  getCustomerLedgerReport,
  exportCustomerLedgerCSV,
  exportCustomerLedgerPDF,
} = require("../controllers/reports.controller");

const authMiddleware = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

/* =========================
   CUSTOMER LEDGER REPORTS
========================= */

// JSON ledger (used by UI table)
router.get(
  "/customer-ledger",
  authMiddleware,
  requireRole("admin"),
  getCustomerLedgerReport
);

// CSV export
router.get(
  "/customer-ledger/export",
  authMiddleware,
  requireRole("admin"),
  exportCustomerLedgerCSV
);

// PDF export
router.get(
  "/customer-ledger/pdf",
  authMiddleware,
  requireRole("admin"),
  exportCustomerLedgerPDF
);

module.exports = router;