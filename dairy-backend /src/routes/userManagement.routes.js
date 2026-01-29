const express = require("express");
const router = express.Router();

const {
  createUser,
  resetPassword,
  toggleUserStatus,
  getUsers,          // ✅ MISSING IMPORT FIXED
} = require("../controllers/userManagement.controller");

const authMiddleware = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

/**
 * USER MANAGEMENT ROUTES
 * Authority enforced INSIDE controller
 */

/**
 * Create user
 * - super_admin → admin, vendor
 * - admin → vendor
 */
router.post(
  "/users/create",
  authMiddleware,
  requireRole("admin"), // admin or super_admin
  createUser
);

/**
 * Reset password
 * - super_admin → admin, vendor
 * - admin → vendor
 */
router.post(
  "/users/reset-password",
  authMiddleware,
  requireRole("admin"),
  resetPassword
);

/**
 * Enable / Disable user
 * - super_admin → admin, vendor
 * - admin → vendor
 */
router.post(
  "/users/toggle-status",
  authMiddleware,
  requireRole("admin"),
  toggleUserStatus
);

/**
 * List users (READ ONLY)
 * - super_admin → admin + vendor
 * - admin → vendor
 */
router.get(
  "/users",
  authMiddleware,
  requireRole("admin"),
  getUsers
);

module.exports = router;