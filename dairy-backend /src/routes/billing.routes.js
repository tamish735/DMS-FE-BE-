const express = require("express");
const router = express.Router();

const { quickBilling } = require("../controllers/billing.controller");
const authMiddleware = require("../middleware/auth.middleware");

// Staff or admin can bill (auth required)
router.post(
  "/billing/quick",
  authMiddleware,
  quickBilling
);

module.exports = router;