// const express = require("express");
// const router = express.Router();

// const authMiddleware = require("../middleware/auth.middleware");
// const { requireRole } = require("../middleware/role.middleware");

// const {
//   saveShortageReason,
//   getPendingShortages,
// } = require("../controllers/stockShortage.controller");

// router.post(
//   "/stock/shortage-reason",
//   authMiddleware,
//   requireRole("admin"),
//   saveShortageReason
// );

// router.get(
//   "/stock/shortages/pending",
//   authMiddleware,
//   requireRole("admin"),
//   getPendingShortages
// );

// module.exports = router;



const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const { saveStockShortageReason } = require("../controllers/stockShortage.controller");

router.post(
  "/stock/shortage/justify",
  authMiddleware,
  saveStockShortageReason
);

module.exports = router;