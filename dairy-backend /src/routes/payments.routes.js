const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const { clearCustomerDue } = require("../controllers/clearDue.controller");

router.post("/payments/clear-due", authMiddleware, clearCustomerDue);

module.exports = router;