import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

import Billing from "./billing";
import ClearDues from "./ClearDues";
import Ledger from "./ledger";
import DailyStock from "./DailyStock";
import StockReconciliation from "./StockReconciliation";
import DayEndReport from "./DayEndReport";
import InvoiceList from "./InvoiceList";
import UserList from "./UserList";
import AuditLog from "./AuditLog";
import MonthlyLedger from "./MonthlyLedger";
import CustomerManagement from "./CustomerManagement";
import CustomerPricing from "./CustomerPricing";
import ProductManagement from "./ProductManagement";

function Dashboard({ onLogout }) {
  const [dayStatus, setDayStatus] = useState("LOADING");
  const [hasDayRecord, setHasDayRecord] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [stockRefreshKey, setStockRefreshKey] = useState(0);

  const [closeDayIssues, setCloseDayIssues] = useState([]);
  const [justifications, setJustifications] = useState({});
  const [showJustificationModal, setShowJustificationModal] = useState(false);

  /* =========================
     AUTH + ROLE
  ========================= */
  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;

  const [role, setRole] = useState("vendor");

  useEffect(() => {
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      setRole(decoded.role || "vendor");
    } catch {
      setRole("vendor");
    }
  }, [token]);

  const isAdminPlus = role === "admin" || role === "super_admin";

  /* =========================
     FETCH DAY STATUS
  ========================= */
  const fetchDayStatus = async () => {
    try {
      const res = await fetch("http://localhost:5001/status", {
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      setDayStatus(data.status);
      setHasDayRecord(data.hasDayRecord);
    } catch {
      setDayStatus("ERROR");
    }
  };

  useEffect(() => {
    fetchDayStatus();
  }, []);

  /* =========================
     OPEN / CLOSE DAY
  ========================= */
  const handleOpenDay = async () => {
    try {
      setLoadingAction(true);
      const res = await fetch("http://localhost:5001/day/open", {
        method: "POST",
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCloseDayIssues([]);
      setShowJustificationModal(false);
      fetchDayStatus();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCloseDay = async () => {
    if (!window.confirm("Are you sure you want to CLOSE the day?")) return;

    try {
      setLoadingAction(true);
      const res = await fetch("http://localhost:5001/day/close", {
        method: "POST",
        headers: { Authorization: authHeader },
      });
      const data = await res.json();

      if (!res.ok && data.reason === "INCOMPLETE_STOCK") {
        alert("Please complete stock entry for all products.");
        return;
      }

      if (!res.ok && data.reason === "JUSTIFICATION_REQUIRED") {
        setCloseDayIssues(data.products || []);
        setShowJustificationModal(true);
        return;
      }

      setCloseDayIssues([]);
      setShowJustificationModal(false);
      fetchDayStatus();
    } catch {
      alert("Unable to close day");
    } finally {
      setLoadingAction(false);
    }
  };

  /* =========================
     SAVE JUSTIFICATION
  ========================= */
  const saveJustification = async (issue) => {
    const reason = justifications[issue.product_id];
    if (!reason) {
      alert("Please enter justification");
      return;
    }

    const res = await fetch("http://localhost:5001/stock/shortage/justify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        product_id: issue.product_id,
        shortage_qty: issue.shortage,
        reason,
      }),
    });

    if (!res.ok) {
      alert("Justification could not be saved");
      return;
    }

    setCloseDayIssues((prev) =>
      prev.filter((p) => p.product_id !== issue.product_id)
    );

    setJustifications((prev) => {
      const copy = { ...prev };
      delete copy[issue.product_id];
      return copy;
    });
  };

  useEffect(() => {
    if (showJustificationModal && closeDayIssues.length === 0) {
      alert("All shortages justified. Click 'Close Day' again.");
      setShowJustificationModal(false);
    }
  }, [closeDayIssues, showJustificationModal]);

  /* =========================
     RENDER
  ========================= */
  return (
    <div style={{ marginTop: 20, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Dairy Management Dashboard</h2>
        <button onClick={onLogout}>Logout</button>
      </div>

      {isAdminPlus && (
        <div style={{ border: "1px solid #ddd", padding: 16, marginTop: 16 }}>
          <strong>Day Status:</strong> {dayStatus}
          {dayStatus === "OPEN" && (
            <button onClick={handleCloseDay} disabled={loadingAction}>
              Close Day
            </button>
          )}
          {dayStatus === "CLOSED" && !hasDayRecord && (
            <button onClick={handleOpenDay}>Open Day</button>
          )}
        </div>
      )}

      {dayStatus === "OPEN" && (
        <>
          <Billing />
          {isAdminPlus && <ClearDues />}
          <InvoiceList />
          {isAdminPlus && (
            <DailyStock onStockSaved={() => setStockRefreshKey(k => k + 1)} />
          )}
        </>
      )}

      {isAdminPlus && <CustomerManagement />}
      {isAdminPlus && <CustomerPricing />}
      {isAdminPlus && <ProductManagement />}
      {isAdminPlus && <UserList />}
      {isAdminPlus && <AuditLog />}

      {isAdminPlus && (
        <StockReconciliation refreshKey={stockRefreshKey} />
      )}

      {isAdminPlus &&
        (dayStatus === "CLOSED" || dayStatus === "LOCKED") && (
          <DayEndReport />
        )}

      <Ledger />
      <MonthlyLedger />

      {/* =========================
         JUSTIFICATION MODAL (RESTORED)
      ========================= */}
      {showJustificationModal && closeDayIssues.length > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              width: 500,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ color: "red" }}>Stock Shortage Justification</h3>

            {closeDayIssues.map((issue) => (
              <div
                key={issue.product_id}
                style={{
                  border: "1px solid #ddd",
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <p>
                  <strong>{issue.product_name}</strong>
                  <br />
                  Shortage: {issue.shortage}
                </p>

                <textarea
                  rows={3}
                  style={{ width: "100%" }}
                  placeholder="Reason (spillage, leakage, damage...)"
                  value={justifications[issue.product_id] || ""}
                  onChange={(e) =>
                    setJustifications((prev) => ({
                      ...prev,
                      [issue.product_id]: e.target.value,
                    }))
                  }
                />

                <button
                  style={{ marginTop: 8 }}
                  onClick={() => saveJustification(issue)}
                >
                  Save Justification
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;



// import { useEffect, useState } from "react";
// import { jwtDecode } from "jwt-decode";

// import Billing from "./billing";
// import ClearDues from "./ClearDues";
// import Ledger from "./ledger";
// import DailyStock from "./DailyStock";
// import StockReconciliation from "./StockReconciliation";
// import DayEndReport from "./DayEndReport";
// import InvoiceList from "./InvoiceList";
// import UserList from "./UserList";
// import AuditLog from "./AuditLog";
// import MonthlyLedger from "./MonthlyLedger";
// import CustomerManagement from "./CustomerManagement";
// import CustomerPricing from "./CustomerPricing"; // ✅ ADDED
// import ProductManagement from "./ProductManagement";

// function Dashboard({ onLogout }) {
//   const [dayStatus, setDayStatus] = useState("LOADING");
//   const [hasDayRecord, setHasDayRecord] = useState(false);
//   const [loadingAction, setLoadingAction] = useState(false);
//   const [stockRefreshKey, setStockRefreshKey] = useState(0);

//   const [closeDayIssues, setCloseDayIssues] = useState([]);
//   const [justifications, setJustifications] = useState({});
//   const [showJustificationModal, setShowJustificationModal] = useState(false);

//   /* =========================
//      AUTH + ROLE
//   ========================= */
//   const token = localStorage.getItem("token");
//   const authHeader = token?.startsWith("Bearer ")
//     ? token
//     : `Bearer ${token}`;

//   const [role, setRole] = useState("vendor");

//   useEffect(() => {
//     if (!token) return;
//     try {
//       const decoded = jwtDecode(token);
//       setRole(decoded.role || "vendor");
//     } catch {
//       setRole("vendor");
//     }
//   }, [token]);

//   const isAdmin = role === "admin";
//   const isSuperAdmin = role === "super_admin";
//   const isAdminPlus = isAdmin || isSuperAdmin;

//   /* =========================
//      FETCH DAY STATUS
//   ========================= */
//   const fetchDayStatus = async () => {
//     try {
//       const res = await fetch("http://localhost:5001/status", {
//         headers: { Authorization: authHeader },
//       });
//       const data = await res.json();
//       setDayStatus(data.status);
//       setHasDayRecord(data.hasDayRecord);
//     } catch {
//       setDayStatus("ERROR");
//     }
//   };

//   useEffect(() => {
//     fetchDayStatus();
//   }, []);

//   /* =========================
//      OPEN / CLOSE DAY
//   ========================= */
//   const handleOpenDay = async () => {
//     try {
//       setLoadingAction(true);
//       const res = await fetch("http://localhost:5001/day/open", {
//         method: "POST",
//         headers: { Authorization: authHeader },
//       });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);
//       setCloseDayIssues([]);
//       setShowJustificationModal(false);
//       fetchDayStatus();
//     } catch (err) {
//       alert(err.message);
//     } finally {
//       setLoadingAction(false);
//     }
//   };

//   const handleCloseDay = async () => {
//     if (!window.confirm("Are you sure you want to CLOSE the day?")) return;

//     try {
//       setLoadingAction(true);
//       const res = await fetch("http://localhost:5001/day/close", {
//         method: "POST",
//         headers: { Authorization: authHeader },
//       });
//       const data = await res.json();

//       if (!res.ok && data.reason === "INCOMPLETE_STOCK") {
//         alert("Please complete stock entry for all products.");
//         return;
//       }

//       if (!res.ok && data.reason === "JUSTIFICATION_REQUIRED") {
//         setCloseDayIssues(data.products || []);
//         setShowJustificationModal(true);
//         return;
//       }

//       setCloseDayIssues([]);
//       setShowJustificationModal(false);
//       fetchDayStatus();
//     } catch {
//       alert("Unable to close day");
//     } finally {
//       setLoadingAction(false);
//     }
//   };

//   /* =========================
//      RENDER
//   ========================= */
//   return (
//     <div style={{ marginTop: 20, padding: 20 }}>
//       {/* HEADER */}
//       <div style={{ display: "flex", justifyContent: "space-between" }}>
//         <h2>Dairy Management Dashboard</h2>
//         <button onClick={onLogout}>Logout</button>
//       </div>

//       {/* DAY STATUS */}
//       {isAdminPlus && (
//         <div style={{ border: "1px solid #ddd", padding: 16, marginTop: 16 }}>
//           <strong>Day Status:</strong> {dayStatus}
//           {dayStatus === "OPEN" && (
//             <button onClick={handleCloseDay} disabled={loadingAction}>
//               Close Day
//             </button>
//           )}
//           {dayStatus === "CLOSED" && !hasDayRecord && (
//             <button onClick={handleOpenDay}>Open Day</button>
//           )}
//         </div>
//       )}

//       {/* OPEN DAY */}
//       {dayStatus === "OPEN" && (
//         <>
//           <Billing />
//           {isAdminPlus && <ClearDues />}
//           <InvoiceList />
//           {isAdminPlus && (
//             <DailyStock onStockSaved={() => setStockRefreshKey(k => k + 1)} />
//           )}
//         </>
//       )}

//       {/* =========================
//          ADMIN MANAGEMENT
//       ========================= */}
//       {isAdminPlus && <CustomerManagement />}
//       {isAdminPlus && <CustomerPricing />}   {/* ✅ STEP 3 */}
//       {isAdminPlus && <ProductManagement />}
//       {isAdminPlus && <UserList />}
//       {isAdminPlus && <AuditLog />}

//       {/* STOCK RECONCILIATION */}
//       {isAdminPlus && (
//         <StockReconciliation refreshKey={stockRefreshKey} />
//       )}

//       {/* DAY END REPORT */}
//       {isAdminPlus &&
//         (dayStatus === "CLOSED" || dayStatus === "LOCKED") && (
//           <DayEndReport />
//         )}

//       {/* LEDGERS */}
//       <Ledger />
//       <MonthlyLedger />
//     </div>
//   );
// }

// export default Dashboard;




// // import { useEffect, useState } from "react";
// // import { jwtDecode } from "jwt-decode";

// // import Billing from "./billing";
// // import ClearDues from "./ClearDues";
// // import Ledger from "./ledger";
// // import DailyStock from "./DailyStock";
// // import StockReconciliation from "./StockReconciliation";
// // import DayEndReport from "./DayEndReport";
// // import InvoiceList from "./InvoiceList";
// // import UserList from "./UserList";
// // import AuditLog from "./AuditLog";
// // import MonthlyLedger from "./MonthlyLedger";
// // import CustomerManagement from "./CustomerManagement";
// // import ProductManagement from "./ProductManagement"; // ✅ ADDED

// // function Dashboard({ onLogout }) {
// //   const [dayStatus, setDayStatus] = useState("LOADING");
// //   const [hasDayRecord, setHasDayRecord] = useState(false);
// //   const [loadingAction, setLoadingAction] = useState(false);
// //   const [stockRefreshKey, setStockRefreshKey] = useState(0);

// //   const [closeDayIssues, setCloseDayIssues] = useState([]);
// //   const [justifications, setJustifications] = useState({});
// //   const [showJustificationModal, setShowJustificationModal] = useState(false);

// //   /* =========================
// //      AUTH + ROLE
// //   ========================= */
// //   const token = localStorage.getItem("token");
// //   const authHeader = token?.startsWith("Bearer ")
// //     ? token
// //     : `Bearer ${token}`;

// //   const [role, setRole] = useState("vendor");

// //   useEffect(() => {
// //     if (!token) return;
// //     try {
// //       const decoded = jwtDecode(token);
// //       setRole(decoded.role || "vendor");
// //     } catch {
// //       setRole("vendor");
// //     }
// //   }, [token]);

// //   const isAdmin = role === "admin";
// //   const isSuperAdmin = role === "super_admin";
// //   const isAdminPlus = isAdmin || isSuperAdmin;

// //   /* =========================
// //      FETCH DAY STATUS
// //   ========================= */
// //   const fetchDayStatus = async () => {
// //     try {
// //       const res = await fetch("http://localhost:5001/status", {
// //         headers: { Authorization: authHeader },
// //       });
// //       const data = await res.json();
// //       setDayStatus(data.status);
// //       setHasDayRecord(data.hasDayRecord);
// //     } catch {
// //       setDayStatus("ERROR");
// //     }
// //   };

// //   useEffect(() => {
// //     fetchDayStatus();
// //   }, []);

// //   /* =========================
// //      OPEN / CLOSE DAY
// //   ========================= */
// //   const handleOpenDay = async () => {
// //     try {
// //       setLoadingAction(true);
// //       const res = await fetch("http://localhost:5001/day/open", {
// //         method: "POST",
// //         headers: { Authorization: authHeader },
// //       });
// //       const data = await res.json();
// //       if (!res.ok) throw new Error(data.message);
// //       setCloseDayIssues([]);
// //       setShowJustificationModal(false);
// //       fetchDayStatus();
// //     } catch (err) {
// //       alert(err.message);
// //     } finally {
// //       setLoadingAction(false);
// //     }
// //   };

// //   const handleCloseDay = async () => {
// //     if (!window.confirm("Are you sure you want to CLOSE the day?")) return;

// //     try {
// //       setLoadingAction(true);
// //       const res = await fetch("http://localhost:5001/day/close", {
// //         method: "POST",
// //         headers: { Authorization: authHeader },
// //       });
// //       const data = await res.json();

// //       if (!res.ok && data.reason === "INCOMPLETE_STOCK") {
// //         alert("Please complete stock entry for all products.");
// //         return;
// //       }

// //       if (!res.ok && data.reason === "JUSTIFICATION_REQUIRED") {
// //         setCloseDayIssues(data.products || []);
// //         setShowJustificationModal(true);
// //         return;
// //       }

// //       setCloseDayIssues([]);
// //       setShowJustificationModal(false);
// //       fetchDayStatus();
// //     } catch {
// //       alert("Unable to close day");
// //     } finally {
// //       setLoadingAction(false);
// //     }
// //   };

// //   /* =========================
// //      RENDER
// //   ========================= */
// //   return (
// //     <div style={{ marginTop: 20, padding: 20 }}>
// //       {/* HEADER */}
// //       <div style={{ display: "flex", justifyContent: "space-between" }}>
// //         <h2>Dairy Management Dashboard</h2>
// //         <button onClick={onLogout}>Logout</button>
// //       </div>

// //       {/* DAY STATUS */}
// //       {isAdminPlus && (
// //         <div style={{ border: "1px solid #ddd", padding: 16, marginTop: 16 }}>
// //           <strong>Day Status:</strong> {dayStatus}
// //           {dayStatus === "OPEN" && (
// //             <button onClick={handleCloseDay} disabled={loadingAction}>
// //               Close Day
// //             </button>
// //           )}
// //           {dayStatus === "CLOSED" && !hasDayRecord && (
// //             <button onClick={handleOpenDay}>Open Day</button>
// //           )}
// //         </div>
// //       )}

// //       {/* OPEN DAY */}
// //       {dayStatus === "OPEN" && (
// //         <>
// //           <Billing />
// //           {isAdminPlus && <ClearDues />}
// //           <InvoiceList />
// //           {isAdminPlus && (
// //             <DailyStock onStockSaved={() => setStockRefreshKey(k => k + 1)} />
// //           )}
// //         </>
// //       )}

// //       {/* ✅ CUSTOMER + PRODUCT MANAGEMENT */}
// //       {isAdminPlus && <CustomerManagement />}
// //       {isAdminPlus && <ProductManagement />}

// //       {/* USER MANAGEMENT */}
// //       {isAdminPlus && <UserList />}

// //       {/* AUDIT LOG */}
// //       {isAdminPlus && <AuditLog />}

// //       {/* STOCK RECONCILIATION */}
// //       {isAdminPlus && (
// //         <StockReconciliation refreshKey={stockRefreshKey} />
// //       )}

// //       {/* DAY END REPORT */}
// //       {isAdminPlus &&
// //         (dayStatus === "CLOSED" || dayStatus === "LOCKED") && (
// //           <DayEndReport />
// //         )}

// //       {/* LEDGERS */}
// //       <Ledger />
// //       <MonthlyLedger />
// //     </div>
// //   );
// // }

// // export default Dashboard;






// // import { useEffect, useState } from "react";
// // import { jwtDecode } from "jwt-decode";

// // import Billing from "./billing";
// // import ClearDues from "./ClearDues";
// // import Ledger from "./ledger";
// // import DailyStock from "./DailyStock";
// // import StockReconciliation from "./StockReconciliation";
// // import DayEndReport from "./DayEndReport";
// // import InvoiceList from "./InvoiceList";
// // import UserList from "./UserList";
// // import AuditLog from "./AuditLog";
// // import MonthlyLedger from "./MonthlyLedger";
// // import CustomerManagement from "./CustomerManagement"; // ✅ ADDED

// // function Dashboard({ onLogout }) {
// //   const [dayStatus, setDayStatus] = useState("LOADING");
// //   const [hasDayRecord, setHasDayRecord] = useState(false);
// //   const [loadingAction, setLoadingAction] = useState(false);
// //   const [stockRefreshKey, setStockRefreshKey] = useState(0);

// //   const [closeDayIssues, setCloseDayIssues] = useState([]);
// //   const [justifications, setJustifications] = useState({});
// //   const [showJustificationModal, setShowJustificationModal] = useState(false);

// //   /* =========================
// //      AUTH + ROLE
// //   ========================= */
// //   const token = localStorage.getItem("token");
// //   const authHeader = token?.startsWith("Bearer ")
// //     ? token
// //     : `Bearer ${token}`;

// //   const [role, setRole] = useState("vendor");

// //   useEffect(() => {
// //     if (!token) return;

// //     try {
// //       const decoded = jwtDecode(token);
// //       setRole(decoded.role || "vendor"); // vendor | admin | super_admin
// //     } catch {
// //       setRole("vendor");
// //     }
// //   }, [token]);

// //   const isAdmin = role === "admin";
// //   const isSuperAdmin = role === "super_admin";
// //   const isAdminPlus = isAdmin || isSuperAdmin;

// //   /* =========================
// //      FETCH DAY STATUS
// //   ========================= */
// //   const fetchDayStatus = async () => {
// //     try {
// //       const res = await fetch("http://localhost:5001/status", {
// //         headers: { Authorization: authHeader },
// //       });

// //       if (!res.ok) throw new Error();

// //       const data = await res.json();
// //       setDayStatus(data.status);
// //       setHasDayRecord(data.hasDayRecord);
// //     } catch {
// //       setDayStatus("ERROR");
// //     }
// //   };

// //   useEffect(() => {
// //     fetchDayStatus();
// //   }, []);

// //   /* =========================
// //      OPEN DAY (ADMIN+)
// //   ========================= */
// //   const handleOpenDay = async () => {
// //     try {
// //       setLoadingAction(true);

// //       const res = await fetch("http://localhost:5001/day/open", {
// //         method: "POST",
// //         headers: { Authorization: authHeader },
// //       });

// //       const data = await res.json();
// //       if (!res.ok) throw new Error(data.message || "Unable to open day");

// //       setCloseDayIssues([]);
// //       setShowJustificationModal(false);
// //       await fetchDayStatus();
// //     } catch (err) {
// //       alert(err.message);
// //     } finally {
// //       setLoadingAction(false);
// //     }
// //   };

// //   /* =========================
// //      CLOSE DAY (ADMIN+)
// //   ========================= */
// //   const handleCloseDay = async () => {
// //     if (!window.confirm("Are you sure you want to CLOSE the day?")) return;

// //     try {
// //       setLoadingAction(true);

// //       const res = await fetch("http://localhost:5001/day/close", {
// //         method: "POST",
// //         headers: { Authorization: authHeader },
// //       });

// //       const data = await res.json();

// //       if (!res.ok && data.reason === "INCOMPLETE_STOCK") {
// //         alert("Please complete stock entry for all products.");
// //         return;
// //       }

// //       if (!res.ok && data.reason === "JUSTIFICATION_REQUIRED") {
// //         setCloseDayIssues(data.products || []);
// //         setShowJustificationModal(true);
// //         return;
// //       }

// //       setCloseDayIssues([]);
// //       setShowJustificationModal(false);
// //       await fetchDayStatus();
// //     } catch {
// //       alert("Unable to close day");
// //     } finally {
// //       setLoadingAction(false);
// //     }
// //   };

// //   /* =========================
// //      SAVE JUSTIFICATION
// //   ========================= */
// //   const saveJustification = async (issue) => {
// //     const reason = justifications[issue.product_id];
// //     if (!reason) {
// //       alert("Please enter justification");
// //       return;
// //     }

// //     const res = await fetch("http://localhost:5001/stock/shortage/justify", {
// //       method: "POST",
// //       headers: {
// //         "Content-Type": "application/json",
// //         Authorization: authHeader,
// //       },
// //       body: JSON.stringify({
// //         product_id: issue.product_id,
// //         shortage_qty: issue.shortage,
// //         reason,
// //       }),
// //     });

// //     if (!res.ok) {
// //       alert("Justification could not be saved");
// //       return;
// //     }

// //     setCloseDayIssues((prev) =>
// //       prev.filter((p) => p.product_id !== issue.product_id)
// //     );

// //     setJustifications((prev) => {
// //       const copy = { ...prev };
// //       delete copy[issue.product_id];
// //       return copy;
// //     });
// //   };

// //   useEffect(() => {
// //     if (showJustificationModal && closeDayIssues.length === 0) {
// //       alert("All shortages justified. Click 'Close Day' again.");
// //       setShowJustificationModal(false);
// //     }
// //   }, [closeDayIssues, showJustificationModal]);

// //   return (
// //     <div style={{ marginTop: "20px", padding: "20px" }}>
// //       {/* HEADER */}
// //       <div style={{ display: "flex", justifyContent: "space-between" }}>
// //         <h2>Dairy Management Dashboard</h2>
// //         <button onClick={onLogout}>Logout</button>
// //       </div>

// //       {/* DAY STATUS */}
// //       {isAdminPlus && (
// //         <div style={{ border: "1px solid #ddd", padding: "16px", marginTop: "16px" }}>
// //           <strong>Day Status:</strong> {dayStatus}

// //           {dayStatus === "OPEN" && (
// //             <button onClick={handleCloseDay} disabled={loadingAction}>
// //               Close Day
// //             </button>
// //           )}

// //           {dayStatus === "CLOSED" && !hasDayRecord && (
// //             <button onClick={handleOpenDay}>Open Day</button>
// //           )}
// //         </div>
// //       )}

// //       {/* OPEN DAY OPERATIONS */}
// //       {dayStatus === "OPEN" && (
// //         <>
// //           <Billing />
// //           {isAdminPlus && <ClearDues />}
// //           <InvoiceList />
// //           {isAdminPlus && (
// //             <DailyStock onStockSaved={() => setStockRefreshKey((k) => k + 1)} />
// //           )}
// //         </>
// //       )}

// //       {/* CUSTOMER MANAGEMENT — ADMIN+ */}
// //       {isAdminPlus && <CustomerManagement />}

// //       {/* USER MANAGEMENT */}
// //       {isAdminPlus && <UserList />}

// //       {/* AUDIT LOG */}
// //       {isAdminPlus && <AuditLog />}

// //       {/* STOCK RECONCILIATION */}
// //       {isAdminPlus &&
// //         (dayStatus === "OPEN" || dayStatus === "CLOSED") && (
// //           <StockReconciliation refreshKey={stockRefreshKey} />
// //         )}

// //       {/* DAY END REPORT */}
// //       {isAdminPlus &&
// //         (dayStatus === "CLOSED" || dayStatus === "LOCKED") && (
// //           <DayEndReport />
// //         )}

// //       {/* LEDGERS */}
// //       <Ledger />
// //       <MonthlyLedger />

// //       {/* JUSTIFICATION MODAL */}
// //       {showJustificationModal && closeDayIssues.length > 0 && (
// //         <div
// //           style={{
// //             position: "fixed",
// //             inset: 0,
// //             background: "rgba(0,0,0,0.5)",
// //             display: "flex",
// //             justifyContent: "center",
// //             alignItems: "center",
// //             zIndex: 1000,
// //           }}
// //         >
// //           <div
// //             style={{
// //               background: "#fff",
// //               padding: "24px",
// //               borderRadius: "8px",
// //               width: "500px",
// //               maxHeight: "80vh",
// //               overflowY: "auto",
// //             }}
// //           >
// //             <h3 style={{ color: "red" }}>Stock Shortage Justification</h3>

// //             {closeDayIssues.map((issue) => (
// //               <div
// //                 key={issue.product_id}
// //                 style={{
// //                   border: "1px solid #ddd",
// //                   padding: "12px",
// //                   marginBottom: "16px",
// //                 }}
// //               >
// //                 <p>
// //                   <strong>{issue.product_name}</strong><br />
// //                   Shortage: {issue.shortage}
// //                 </p>

// //                 <textarea
// //                   rows={3}
// //                   style={{ width: "100%" }}
// //                   placeholder="Reason (spillage, leakage, damage...)"
// //                   value={justifications[issue.product_id] || ""}
// //                   onChange={(e) =>
// //                     setJustifications((prev) => ({
// //                       ...prev,
// //                       [issue.product_id]: e.target.value,
// //                     }))
// //                   }
// //                 />

// //                 <button
// //                   style={{ marginTop: "8px" }}
// //                   onClick={() => saveJustification(issue)}
// //                 >
// //                   Save Justification
// //                 </button>
// //               </div>
// //             ))}
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // export default Dashboard;



// // import { useEffect, useState } from "react";
// // import { jwtDecode } from "jwt-decode";

// // import Billing from "./billing";
// // import ClearDues from "./ClearDues";
// // import Ledger from "./ledger";
// // import DailyStock from "./DailyStock";
// // import StockReconciliation from "./StockReconciliation";
// // import DayEndReport from "./DayEndReport";
// // import InvoiceList from "./InvoiceList";
// // import UserList from "./UserList";
// // import AuditLog from "./AuditLog";
// // import MonthlyLedger from "./MonthlyLedger";

// // function Dashboard({ onLogout }) {
// //   const [dayStatus, setDayStatus] = useState("LOADING");
// //   const [hasDayRecord, setHasDayRecord] = useState(false);
// //   const [loadingAction, setLoadingAction] = useState(false);
// //   const [stockRefreshKey, setStockRefreshKey] = useState(0);

// //   const [closeDayIssues, setCloseDayIssues] = useState([]);
// //   const [justifications, setJustifications] = useState({});
// //   const [showJustificationModal, setShowJustificationModal] = useState(false);

// //   /* =========================
// //      AUTH + ROLE
// //   ========================= */
// //   const token = localStorage.getItem("token");
// //   const authHeader = token?.startsWith("Bearer ")
// //     ? token
// //     : `Bearer ${token}`;

// //   const [role, setRole] = useState("vendor");

// //   useEffect(() => {
// //     if (!token) return;

// //     try {
// //       const decoded = jwtDecode(token);
// //       setRole(decoded.role || "vendor"); // vendor | admin | super_admin
// //     } catch {
// //       setRole("vendor");
// //     }
// //   }, [token]);

// //   const isAdmin = role === "admin";
// //   const isSuperAdmin = role === "super_admin";
// //   const isAdminPlus = isAdmin || isSuperAdmin;

// //   /* =========================
// //      FETCH DAY STATUS
// //   ========================= */
// //   const fetchDayStatus = async () => {
// //     try {
// //       const res = await fetch("http://localhost:5001/status", {
// //         headers: { Authorization: authHeader },
// //       });

// //       if (!res.ok) throw new Error();

// //       const data = await res.json();
// //       setDayStatus(data.status);
// //       setHasDayRecord(data.hasDayRecord);
// //     } catch {
// //       setDayStatus("ERROR");
// //     }
// //   };

// //   useEffect(() => {
// //     fetchDayStatus();
// //   }, []);

// //   /* =========================
// //      OPEN DAY (ADMIN+)
// //   ========================= */
// //   const handleOpenDay = async () => {
// //     try {
// //       setLoadingAction(true);

// //       const res = await fetch("http://localhost:5001/day/open", {
// //         method: "POST",
// //         headers: { Authorization: authHeader },
// //       });

// //       const data = await res.json();
// //       if (!res.ok) throw new Error(data.message || "Unable to open day");

// //       setCloseDayIssues([]);
// //       setShowJustificationModal(false);
// //       await fetchDayStatus();
// //     } catch (err) {
// //       alert(err.message);
// //     } finally {
// //       setLoadingAction(false);
// //     }
// //   };

// //   /* =========================
// //      CLOSE DAY (ADMIN+)
// //   ========================= */
// //   const handleCloseDay = async () => {
// //     if (!window.confirm("Are you sure you want to CLOSE the day?")) return;

// //     try {
// //       setLoadingAction(true);

// //       const res = await fetch("http://localhost:5001/day/close", {
// //         method: "POST",
// //         headers: { Authorization: authHeader },
// //       });

// //       const data = await res.json();

// //       if (!res.ok && data.reason === "INCOMPLETE_STOCK") {
// //         alert("Please complete stock entry for all products.");
// //         return;
// //       }

// //       if (!res.ok && data.reason === "JUSTIFICATION_REQUIRED") {
// //         setCloseDayIssues(data.products || []);
// //         setShowJustificationModal(true);
// //         return;
// //       }

// //       setCloseDayIssues([]);
// //       setShowJustificationModal(false);
// //       await fetchDayStatus();
// //     } catch {
// //       alert("Unable to close day");
// //     } finally {
// //       setLoadingAction(false);
// //     }
// //   };

// //   /* =========================
// //      SAVE JUSTIFICATION
// //   ========================= */
// //   const saveJustification = async (issue) => {
// //     const reason = justifications[issue.product_id];
// //     if (!reason) {
// //       alert("Please enter justification");
// //       return;
// //     }

// //     const res = await fetch("http://localhost:5001/stock/shortage/justify", {
// //       method: "POST",
// //       headers: {
// //         "Content-Type": "application/json",
// //         Authorization: authHeader,
// //       },
// //       body: JSON.stringify({
// //         product_id: issue.product_id,
// //         shortage_qty: issue.shortage,
// //         reason,
// //       }),
// //     });

// //     if (!res.ok) {
// //       alert("Justification could not be saved");
// //       return;
// //     }

// //     setCloseDayIssues((prev) =>
// //       prev.filter((p) => p.product_id !== issue.product_id)
// //     );

// //     setJustifications((prev) => {
// //       const copy = { ...prev };
// //       delete copy[issue.product_id];
// //       return copy;
// //     });
// //   };

// //   useEffect(() => {
// //     if (showJustificationModal && closeDayIssues.length === 0) {
// //       alert("All shortages justified. Click 'Close Day' again.");
// //       setShowJustificationModal(false);
// //     }
// //   }, [closeDayIssues, showJustificationModal]);

// //   return (
// //     <div style={{ marginTop: "20px", padding: "20px" }}>
// //       {/* HEADER */}
// //       <div style={{ display: "flex", justifyContent: "space-between" }}>
// //         <h2>Dairy Management Dashboard</h2>
// //         <button onClick={onLogout}>Logout</button>
// //       </div>

// //       {/* DAY STATUS — ADMIN+ ONLY */}
// //       {isAdminPlus && (
// //         <div style={{ border: "1px solid #ddd", padding: "16px", marginTop: "16px" }}>
// //           <strong>Day Status:</strong> {dayStatus}

// //           {dayStatus === "OPEN" && (
// //             <button onClick={handleCloseDay} disabled={loadingAction}>
// //               Close Day
// //             </button>
// //           )}

// //           {dayStatus === "CLOSED" && !hasDayRecord && (
// //             <button onClick={handleOpenDay}>Open Day</button>
// //           )}
// //         </div>
// //       )}

// //       {/* OPEN DAY OPERATIONS */}
// //       {dayStatus === "OPEN" && (
// //         <>
// //           <Billing />
// //           {isAdminPlus && <ClearDues />}
// //           <InvoiceList />
// //           {isAdminPlus && (
// //             <DailyStock onStockSaved={() => setStockRefreshKey((k) => k + 1)} />
// //           )}
// //         </>
// //       )}

// //       {/* USER MANAGEMENT — ADMIN+ (DAY INDEPENDENT) */}
// //       {isAdminPlus && <UserList />}


// //       {/* AUDIT LOG */}
// //       {isAdminPlus && <AuditLog />}

// //       {/* STOCK RECONCILIATION */}
// //       {isAdminPlus &&
// //         (dayStatus === "OPEN" || dayStatus === "CLOSED") && (
// //           <StockReconciliation refreshKey={stockRefreshKey} />
// //         )}

// //       {/* DAY END REPORT */}
// //       {isAdminPlus &&
// //         (dayStatus === "CLOSED" || dayStatus === "LOCKED") && (
// //           <DayEndReport />
// //         )}

// //       {/* LEDGER — ALL */}
// //       <Ledger />

// //       <MonthlyLedger />

// //       {/* JUSTIFICATION MODAL */}
// //       {showJustificationModal && closeDayIssues.length > 0 && (
// //         <div
// //           style={{
// //             position: "fixed",
// //             inset: 0,
// //             background: "rgba(0,0,0,0.5)",
// //             display: "flex",
// //             justifyContent: "center",
// //             alignItems: "center",
// //             zIndex: 1000,
// //           }}
// //         >
// //           <div
// //             style={{
// //               background: "#fff",
// //               padding: "24px",
// //               borderRadius: "8px",
// //               width: "500px",
// //               maxHeight: "80vh",
// //               overflowY: "auto",
// //             }}
// //           >
// //             <h3 style={{ color: "red" }}>Stock Shortage Justification</h3>

// //             {closeDayIssues.map((issue) => (
// //               <div
// //                 key={issue.product_id}
// //                 style={{
// //                   border: "1px solid #ddd",
// //                   padding: "12px",
// //                   marginBottom: "16px",
// //                 }}
// //               >
// //                 <p>
// //                   <strong>{issue.product_name}</strong><br />
// //                   Shortage: {issue.shortage}
// //                 </p>

// //                 <textarea
// //                   rows={3}
// //                   style={{ width: "100%" }}
// //                   placeholder="Reason (spillage, leakage, damage...)"
// //                   value={justifications[issue.product_id] || ""}
// //                   onChange={(e) =>
// //                     setJustifications((prev) => ({
// //                       ...prev,
// //                       [issue.product_id]: e.target.value,
// //                     }))
// //                   }
// //                 />

// //                 <button
// //                   style={{ marginTop: "8px" }}
// //                   onClick={() => saveJustification(issue)}
// //                 >
// //                   Save Justification
// //                 </button>
// //               </div>
// //             ))}
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // export default Dashboard;