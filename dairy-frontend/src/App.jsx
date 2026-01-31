import { useEffect, useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/dashboard";
import Billing from "./components/billing";
import DailyStock from "./components/DailyStock";
import CustomerManagement from "./components/CustomerManagement";
import CustomerPricing from "./components/CustomerPricing";
import ProductManagement from "./components/ProductManagement";
import UserList from "./components/UserList";
import AuditLog from "./components/AuditLog";
import Ledger from "./components/ledger";
import InvoiceList from "./components/InvoiceList";
import StockReconciliation from "./components/StockReconciliation";
import { Toaster } from "react-hot-toast";
import "./App.css";
import MonthlyLedger from "./components/MonthlyLedger";
import ClearDues from "./components/ClearDues";

/* =========================
   AUTH UTILS
========================= */
const hasValidToken = () => Boolean(localStorage.getItem("token"));

/* =========================
   SAFE PAGE LAYOUT
   (Vertical + Horizontal)
========================= */
function PageLayout({ title, onBack, children }) {
  return (
    <div className="page-layout">
      {/* Fixed header */}
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>
          ← Dashboard
        </button>
        <h2>{title}</h2>
      </div>

      {/* ✅ BOTH SCROLLS ENABLED */}
      <div className="page-body--both-scroll">
        {children}
      </div>
    </div>
  );
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(hasValidToken());
  const [activePage, setActivePage] = useState("dashboard");
  const [stockRefreshKey, setStockRefreshKey] = useState(0);

  useEffect(() => {
    if (!hasValidToken()) setIsLoggedIn(false);

    const onStorage = () => {
      if (!hasValidToken()) setIsLoggedIn(false);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setActivePage("dashboard");
  };

  const navigate = (page) => {
    setActivePage(page);
  };

  if (!isLoggedIn) {
    return (
      <>
        <Toaster position="top-right" />
        <Login onLoginSuccess={() => setIsLoggedIn(true)} />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />

      {activePage === "dashboard" && (
        <Dashboard onNavigate={navigate} onLogout={handleLogout} />
      )}

      {activePage === "billing" && (
        <PageLayout title="Billing" onBack={() => navigate("dashboard")}>
          <Billing />
        </PageLayout>
      )}

      {activePage === "dailyStock" && (
        <PageLayout title="Daily Stock" onBack={() => navigate("dashboard")}>
          <DailyStock onStockSaved={() => setStockRefreshKey((k) => k + 1)} />
        </PageLayout>
      )}



      {activePage === "clearDues" && (
        <PageLayout title="Clear Dues" onBack={() => navigate("dashboard")}>
        <ClearDues />
        </PageLayout>
      )}



      {activePage === "stockReconciliation" && (
        <PageLayout title="Stock Reconciliation" onBack={() => navigate("dashboard")}>
          <StockReconciliation refreshKey={stockRefreshKey} />
        </PageLayout>
      )}

      {activePage === "customers" && (
        <PageLayout title="Customer Management" onBack={() => navigate("dashboard")}>
          <CustomerManagement />
        </PageLayout>
      )}

      {activePage === "customerPricing" && (
        <PageLayout title="Customer Pricing" onBack={() => navigate("dashboard")}>
          <CustomerPricing />
        </PageLayout>
      )}

      {activePage === "products" && (
        <PageLayout title="Product Management" onBack={() => navigate("dashboard")}>
          <ProductManagement />
        </PageLayout>
      )}

      {activePage === "users" && (
        <PageLayout title="User Management" onBack={() => navigate("dashboard")}>
          <UserList />
        </PageLayout>
      )}

      {activePage === "audit" && (
        <PageLayout title="Audit Log" onBack={() => navigate("dashboard")}>
          <AuditLog />
        </PageLayout>
      )}

      {activePage === "ledger" && (
        <PageLayout title="Customer & Monthly Ledger" onBack={() => navigate("dashboard")}>
          <Ledger />
        </PageLayout>
      )}

      {activePage === "invoices" && (
        <PageLayout title="Invoices" onBack={() => navigate("dashboard")}>
          <InvoiceList />
        </PageLayout>
      )}

      {activePage === "monthlyLedger" && (
        <PageLayout title="Monthly Customer Ledger" onBack={() => navigate("dashboard")}>
          <MonthlyLedger />
        </PageLayout>
      )}
    </>
  );
}

export default App;