// Load environment variables FIRST
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

/* =========================
   GLOBAL MIDDLEWARE
========================= */

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

/* =========================
   ROUTE IMPORTS
========================= */

const greetRoutes = require("./routes/greet.routes");
const authRoutes = require("./routes/auth.routes");
const dayRoutes = require("./routes/day.routes");
const productRoutes = require("./routes/product.routes");
const billingRoutes = require("./routes/billing.routes");
const ledgerRoutes = require("./routes/ledger.routes");
const summaryRoutes = require("./routes/summary.routes");
const dayReportRoutes = require("./routes/dayReport.routes");
const customerRoutes = require("./routes/customer.routes");
const dailyStockRoutes = require("./routes/dailyStock.routes");
const stockRoutes = require("./routes/stock.routes");
const stockReconciliationRoutes = require("./routes/stockReconciliation.routes");
const stockShortageRoutes = require("./routes/stockShortage.routes");
const paymentRoutes = require("./routes/payments.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const userManagementRoutes = require("./routes/userManagement.routes");
const auditLogRoutes = require("./routes/auditLog.routes");
const reportsRoutes = require("./routes/reports.routes");
const customerPricingRoutes = require("./routes/customerPricing.routes");

/* =========================
   ROUTE REGISTRATION
========================= */

// Auth & greeting
app.use(authRoutes);
app.use(greetRoutes);

// Day lifecycle
app.use(dayRoutes);

// Master data
app.use(productRoutes);
app.use(customerRoutes);

// Operations
app.use(billingRoutes);
app.use(paymentRoutes);
app.use(ledgerRoutes);
app.use(summaryRoutes);

// Stock
app.use(dailyStockRoutes);
app.use(stockRoutes);
app.use(stockReconciliationRoutes);
app.use(stockShortageRoutes);

// Day reports
app.use(dayReportRoutes);

// ✅ REPORTS — REGISTER ONCE, WITH PREFIX ONLY
app.use("/reports", reportsRoutes);

// Invoices & users
app.use(invoiceRoutes);
app.use(userManagementRoutes);
app.use(auditLogRoutes);
app.use(customerPricingRoutes);



/* =========================
   HEALTH
========================= */

app.get("/", (req, res) => {
  res.send("Backend is running");
});

module.exports = app;




// // Load environment variables FIRST
// require("dotenv").config();

// const express = require("express");
// const cors = require("cors");

// const app = express();

// /* =========================
//    GLOBAL MIDDLEWARE
// ========================= */

// app.use(
//   cors({
//     origin: "http://localhost:5173",
//     credentials: true,
//   })
// );

// app.use(express.json());

// /* =========================
//    ROUTE IMPORTS
// ========================= */

// const greetRoutes = require("./routes/greet.routes");
// const authRoutes = require("./routes/auth.routes");
// const dayRoutes = require("./routes/day.routes");
// const productRoutes = require("./routes/product.routes");
// const billingRoutes = require("./routes/billing.routes");
// const ledgerRoutes = require("./routes/ledger.routes");
// const summaryRoutes = require("./routes/summary.routes");
// const dayReportRoutes = require("./routes/dayReport.routes");
// const customerRoutes = require("./routes/customer.routes");
// const dailyStockRoutes = require("./routes/dailyStock.routes");
// const stockRoutes = require("./routes/stock.routes");
// const stockReconciliationRoutes = require("./routes/stockReconciliation.routes");
// const stockShortageRoutes = require("./routes/stockShortage.routes");
// const paymentRoutes = require("./routes/payments.routes");
// const invoiceRoutes = require("./routes/invoice.routes");
// const userManagementRoutes = require("./routes/userManagement.routes");
// const auditLogRoutes = require("./routes/auditLog.routes");
// const reportsRoutes = require("./routes/reports.routes");

// /* =========================
//    ROUTE REGISTRATION
// ========================= */

// app.use(authRoutes);
// app.use(greetRoutes);

// app.use(dayRoutes);
// app.use(productRoutes);
// app.use(customerRoutes);

// app.use(billingRoutes);
// app.use(paymentRoutes);
// app.use(ledgerRoutes);
// app.use(summaryRoutes);

// app.use(dailyStockRoutes);
// app.use(stockRoutes);
// app.use(stockReconciliationRoutes);
// app.use(stockShortageRoutes);

// app.use(dayReportRoutes);

// /* ✅ REPORTS — REGISTER ONCE, WITH PREFIX */
// app.use("/reports", reportsRoutes);

// app.use(invoiceRoutes);
// app.use(userManagementRoutes);
// app.use(auditLogRoutes);

// /* =========================
//    HEALTH
// ========================= */

// app.get("/", (req, res) => {
//   res.send("Backend is running");
// });

// module.exports = app;



// // // Load environment variables FIRST
// // require("dotenv").config();

// // // Core imports
// // const express = require("express");
// // const cors = require("cors");

// // // Create app
// // const app = express();

// // /* =========================
// //    GLOBAL MIDDLEWARE
// // ========================= */

// // app.use(
// //   cors({
// //     origin: "http://localhost:5173",
// //     credentials: true,
// //   })
// // );

// // app.use(express.json());

// // /* =========================
// //    ROUTE IMPORTS
// // ========================= */

// // const greetRoutes = require("./routes/greet.routes");
// // const authRoutes = require("./routes/auth.routes");
// // const dayRoutes = require("./routes/day.routes");
// // const productRoutes = require("./routes/product.routes");
// // const billingRoutes = require("./routes/billing.routes");
// // const ledgerRoutes = require("./routes/ledger.routes");
// // const summaryRoutes = require("./routes/summary.routes");
// // const dayReportRoutes = require("./routes/dayReport.routes");
// // const customerRoutes = require("./routes/customer.routes");
// // const dailyStockRoutes = require("./routes/dailyStock.routes");
// // const stockReconciliationRoutes = require("./routes/stockReconciliation.routes");
// // const userManagementRoutes = require("./routes/userManagement.routes");
// // const stockRoutes = require("./routes/stock.routes");
// // const stockShortageRoutes = require("./routes/stockShortage.routes");
// // const paymentRoutes = require("./routes/payments.routes");
// // const invoiceRoutes = require("./routes/invoice.routes");
// // const auditLogRoutes = require("./routes/auditLog.routes");
// // const reportsRoutes = require("./routes/reports.routes");

// // /* =========================
// //    ROUTE REGISTRATION
// // ========================= */

// // // Auth & core
// // app.use(authRoutes);
// // app.use(greetRoutes);

// // // Day lifecycle
// // app.use(dayRoutes);

// // // Master data
// // app.use(productRoutes);
// // app.use(customerRoutes);

// // // Operations
// // app.use(billingRoutes);
// // app.use(paymentRoutes);
// // app.use(ledgerRoutes);
// // app.use(summaryRoutes);

// // // Stock
// // app.use(dailyStockRoutes);
// // app.use(stockRoutes);
// // app.use(stockReconciliationRoutes);
// // app.use(stockShortageRoutes);

// // // Reports (✅ ONLY ONCE)
// // app.use(reportsRoutes);

// // // Invoices
// // app.use(invoiceRoutes);

// // // User management & audit
// // app.use(userManagementRoutes);
// // app.use(auditLogRoutes);

// // /* =========================
// //    HEALTH & DEBUG
// // ========================= */

// // app.get("/", (req, res) => {
// //   res.send("Backend is running");
// // });

// // app.get("/debug", (req, res) => {
// //   res.send("DEBUG OK");
// // });

// // module.exports = app;