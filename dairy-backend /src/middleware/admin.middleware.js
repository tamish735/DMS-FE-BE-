const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // ✅ Allow BOTH admin and super_admin
  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    return res.status(403).json({
      message: "Admin access required",
    });
  }

  next();
};

module.exports = adminMiddleware;