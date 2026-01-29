// const express = require("express");
// const router = express.Router();

// const { getDayEndReport } = require("../controllers/dayReport.controller");
// const authMiddleware = require("../middleware/auth.middleware");

// router.get("/reports/day", authMiddleware, getDayEndReport);

// module.exports = router;




const express = require("express");
const router = express.Router();

const { getDayEndReport } = require("../controllers/dayReport.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");

router.get(
  "/day/report",
  authMiddleware,
  requireRole("admin", "super_admin"),
  getDayEndReport
);

module.exports = router;