// const express = require("express");
// const router = express.Router();

// const authMiddleware = require("../middleware/auth.middleware");
// const { getInvoiceById } = require("../controllers/invoice.controller");

// router.get(
//   "/invoice/:invoice_id",
//   authMiddleware,
//   getInvoiceById
// );

// module.exports = router;




// const express = require("express");
// const router = express.Router();
// const authMiddleware = require("../middleware/auth.middleware");
// const { getInvoiceById } = require("../controllers/invoice.controller");

// router.get("/invoice/:invoice_id", authMiddleware, getInvoiceById);

// module.exports = router;





// const express = require("express");
// const router = express.Router();
// const authMiddleware = require("../middleware/auth.middleware");

// const {
//   getInvoiceById,
//   getInvoiceList,
// } = require("../controllers/invoice.controller");

// /* =========================
//    INVOICE LIST
//    GET /invoice
// ========================= */
// router.get("/invoice", authMiddleware, getInvoiceList);

// /* =========================
//    SINGLE INVOICE (VIEW)
//    GET /invoice/:invoice_id
// ========================= */
// router.get("/invoice/:invoice_id", authMiddleware, getInvoiceById);

// module.exports = router;




const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");

const {
  getInvoiceById,
  getInvoiceList,
} = require("../controllers/invoice.controller");

/* =========================
   INVOICE ROUTES
========================= */

// 🔹 List invoices (role-based)
router.get("/invoices", authMiddleware, getInvoiceList);

// 🔹 View single invoice
router.get("/invoice/:invoice_id", authMiddleware, getInvoiceById);

module.exports = router;