const express = require("express");
const router = express.Router();

const {
  addProduct,
  updateProduct,
  listActiveProducts,
  listAllProducts,
  activateProduct,
  deactivateProduct,
} = require("../controllers/product.controller");

const authMiddleware = require("../middleware/auth.middleware");
const adminMiddleware = require("../middleware/admin.middleware");

/* =========================
   CREATE PRODUCT
========================= */
router.post(
  "/products",
  authMiddleware,
  adminMiddleware,
  addProduct
);

/* =========================
   UPDATE PRODUCT
========================= */
router.put(
  "/products/:id",
  authMiddleware,
  adminMiddleware,
  updateProduct
);

/* =========================
   LIST ACTIVE PRODUCTS
   → Billing, Daily Stock
========================= */
router.get(
  "/products",
  authMiddleware,
  listActiveProducts
);

/* =========================
   LIST ALL PRODUCTS
   → Product Management
========================= */
router.get(
  "/products/all",
  authMiddleware,
  adminMiddleware,
  listAllProducts
);

/* =========================
   DEACTIVATE PRODUCT
========================= */
router.patch(
  "/products/:id/deactivate",
  authMiddleware,
  adminMiddleware,
  deactivateProduct
);

/* =========================
   ACTIVATE PRODUCT
========================= */
router.patch(
  "/products/:id/activate",
  authMiddleware,
  adminMiddleware,
  activateProduct
);

module.exports = router;



// const express = require("express");
// const router = express.Router();

// const {
//   addProduct,
//   updateProduct,
//   listActiveProducts
// } = require("../controllers/product.controller");

// const authMiddleware = require("../middleware/auth.middleware");
// const adminMiddleware = require("../middleware/admin.middleware");

// // Admin-only
// router.post("/products", authMiddleware, adminMiddleware, addProduct);
// router.put("/products/:id", authMiddleware, adminMiddleware, updateProduct);

// // Used by billing (auth required)
// router.get("/products", authMiddleware, listActiveProducts);

// module.exports = router;