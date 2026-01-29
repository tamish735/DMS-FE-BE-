/**
 * Strict role-based access control middleware
 * Usage:
 *   requireRole("admin")
 *   requireRole("super_admin")
 */

const ROLE_ORDER = {
  vendor: 1,
  admin: 2,
  super_admin: 3,
};

const requireRole = (requiredRole) => {
  return (req, res, next) => {
    try {
      const user = req.user;

      if (!user || !user.role) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userLevel = ROLE_ORDER[user.role];
      const requiredLevel = ROLE_ORDER[requiredRole];

      if (!userLevel || !requiredLevel) {
        return res.status(403).json({ message: "Invalid role configuration" });
      }

      // Strict hierarchy enforcement
      if (userLevel < requiredLevel) {
        return res.status(403).json({ message: "Forbidden" });
      }

      next();
    } catch (err) {
      console.error("ROLE MIDDLEWARE ERROR:", err);
      return res.status(500).json({ message: "Access control error" });
    }
  };
};

module.exports = {
  requireRole,
};