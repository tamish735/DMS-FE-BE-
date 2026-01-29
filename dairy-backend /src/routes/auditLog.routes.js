const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { getAuditLogs } = require("../controllers/auditLog.controller");

/**
 * AUDIT LOG ROUTES
 * admin & super_admin only
 */
router.get(
  "/audit-logs",
  authMiddleware,
  requireRole("super_admin"),
  getAuditLogs
);

module.exports = router;