const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

const {
  getCustomerPrices,
  setCustomerPrice,
  removeCustomerPrice,
} = require("../controllers/customerPricing.controller");

/* =========================
   CUSTOMER PRICING ROUTES
========================= */

/**
 * View customer-specific prices
 * Allowed: admin, super_admin
 */
router.get(
  "/customers/:id/prices",
  authMiddleware,
  getCustomerPrices
);

/**
 * Set / update customer-specific price
 * Allowed: admin only (super_admin will be fixed at middleware level later)
 */
router.post(
  "/customers/:id/prices",
  authMiddleware,
  adminMiddleware,
  setCustomerPrice
);

/**
 * Remove customer-specific price
 * Allowed: admin only (super_admin will be fixed at middleware level later)
 */
router.delete(
  "/customers/:id/prices/:productId",
  authMiddleware,
  adminMiddleware,
  removeCustomerPrice
);

module.exports = router;