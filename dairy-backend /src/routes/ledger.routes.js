

const express = require("express");
const router = express.Router();

const { getCustomerLedger } = require("../controllers/ledger.controller");
const authMiddleware = require("../middleware/auth.middleware");

console.log("Ledger routes loaded");

router.get(
  "/ledger/customer/:customer_id",
  authMiddleware,
  getCustomerLedger
);

module.exports = router;