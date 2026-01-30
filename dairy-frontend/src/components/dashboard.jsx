import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";

function Dashboard({ onNavigate, onLogout }) {
  const [dayStatus, setDayStatus] = useState("LOADING");
  const [hasDayRecord, setHasDayRecord] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  /* =========================
     JUSTIFICATION STATE
  ========================= */
  const [needsJustification, setNeedsJustification] = useState(false);
  const [shortageProducts, setShortageProducts] = useState([]);
  const [justification, setJustification] = useState("");

  /* =========================
     LIVE DATE & TIME
  ========================= */
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const formattedDateTime = now.toLocaleString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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
     OPEN DAY
  ========================= */
  const handleOpenDay = async () => {
    try {
      setLoadingAction(true);
      await fetch("http://localhost:5001/day/open", {
        method: "POST",
        headers: { Authorization: authHeader },
      });
      fetchDayStatus();
    } finally {
      setLoadingAction(false);
    }
  };

  /* =========================
     CLOSE DAY
  ========================= */
  const handleCloseDay = async () => {
    if (!window.confirm("Are you sure you want to CLOSE the day?")) return;

    try {
      setLoadingAction(true);

      const res = await fetch("http://localhost:5001/day/close", {
        method: "POST",
        headers: { Authorization: authHeader },
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.reason === "JUSTIFICATION_REQUIRED") {
          setNeedsJustification(true);
          setShortageProducts(data.products || []);
          return;
        }
        throw new Error("Unable to close day");
      }

      fetchDayStatus();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  /* =========================
     SUBMIT JUSTIFICATION (FIXED)
  ========================= */
  const submitJustification = async () => {
    if (!justification.trim()) {
      alert("Please enter justification");
      return;
    }

    try {
      setLoadingAction(true);

      const payload = {
        justification,
        products: shortageProducts.map((p) => ({
          product_id: p.product_id,
          shortage: p.shortage,
        })),
      };

      const res = await fetch("http://localhost:5001/day/close", {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to submit justification");
      }

      // SUCCESS
      setNeedsJustification(false);
      setShortageProducts([]);
      setJustification("");
      fetchDayStatus();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* HEADER */}
      <div style={{ background: "#1e293b", color: "#fff", padding: "12px 16px" }}>
        <h2 style={{ marginBottom: 4 }}>Plant Management</h2>
        <p style={{ fontSize: 13 }}>{formattedDateTime}</p>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <div>
            <strong>Role:</strong> {role} &nbsp; | &nbsp;
            <strong>Status:</strong> {dayStatus}
          </div>
          <button onClick={onLogout}>Logout</button>
        </div>

        {isAdminPlus && (
          <div style={{ marginTop: 8 }}>
            {dayStatus === "OPEN" && (
              <button onClick={handleCloseDay} disabled={loadingAction}>
                Close Day
              </button>
            )}
            {dayStatus === "CLOSED" && !hasDayRecord && (
              <button onClick={handleOpenDay} disabled={loadingAction}>
                Open Day
              </button>
            )}
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div className="dashboard-grid">
          <Card icon="💳" title="Billing" onClick={() => onNavigate("billing")} />
          <Card icon="📒" title="Ledger" onClick={() => onNavigate("ledger")} />
          <Card icon="📊" title="Monthly Ledger" onClick={() => onNavigate("monthlyLedger")} />
          <Card icon="🧾" title="Invoices" onClick={() => onNavigate("invoices")} />

          {isAdminPlus && (
            <>
              <Card icon="📦" title="Daily Stock" onClick={() => onNavigate("dailyStock")} />
              <Card icon="🔄" title="Stock Reconciliation" onClick={() => onNavigate("stockReconciliation")} />
              <Card icon="👥" title="Customers" onClick={() => onNavigate("customers")} />
              <Card icon="💰" title="Customer Pricing" onClick={() => onNavigate("customerPricing")} />
              <Card icon="🧺" title="Products" onClick={() => onNavigate("products")} />
              <Card icon="👤" title="Users" onClick={() => onNavigate("users")} />
              <Card icon="🛡️" title="Audit Log" onClick={() => onNavigate("audit")} />
            </>
          )}
        </div>

        {/* JUSTIFICATION UI */}
        {needsJustification && (
          <div className="card" style={{ marginTop: 20 }}>
            <h3>Stock Shortage Justification Required</h3>

            <ul>
              {shortageProducts.map((p) => (
                <li key={p.product_id}>
                  {p.product_name} — shortage: {p.shortage}
                </li>
              ))}
            </ul>

            <textarea
              placeholder="Enter justification..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              style={{ width: "100%", marginTop: 8 }}
            />

            <button
              onClick={submitJustification}
              disabled={loadingAction}
              style={{ marginTop: 8 }}
            >
              Submit Justification
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ icon, title, onClick }) {
  return (
    <div className="dashboard-card" onClick={onClick}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <span>{title}</span>
    </div>
  );
}

export default Dashboard;




// import { useEffect, useState } from "react";
// import { jwtDecode } from "jwt-decode";

// function Dashboard({ onNavigate, onLogout }) {
//   const [dayStatus, setDayStatus] = useState("LOADING");
//   const [hasDayRecord, setHasDayRecord] = useState(false);
//   const [loadingAction, setLoadingAction] = useState(false);

//   /* =========================
//      JUSTIFICATION (NEW, SAFE)
//   ========================= */
//   const [needsJustification, setNeedsJustification] = useState(false);
//   const [shortageProducts, setShortageProducts] = useState([]);
//   const [justification, setJustification] = useState("");

//   /* =========================
//      LIVE DATE & TIME
//   ========================= */
//   const [now, setNow] = useState(new Date());

//   useEffect(() => {
//     const interval = setInterval(() => setNow(new Date()), 30000);
//     return () => clearInterval(interval);
//   }, []);

//   const formattedDateTime = now.toLocaleString("en-IN", {
//     weekday: "long",
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//   });

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

//   const isAdminPlus = role === "admin" || role === "super_admin";

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
//      OPEN DAY
//   ========================= */
//   const handleOpenDay = async () => {
//     try {
//       setLoadingAction(true);
//       await fetch("http://localhost:5001/day/open", {
//         method: "POST",
//         headers: { Authorization: authHeader },
//       });
//       fetchDayStatus();
//     } finally {
//       setLoadingAction(false);
//     }
//   };

//   /* =========================
//      CLOSE DAY (FIXED PROPERLY)
//   ========================= */
//   const handleCloseDay = async () => {
//     if (!window.confirm("Are you sure you want to CLOSE the day?")) return;

//     try {
//       setLoadingAction(true);

//       const res = await fetch("http://localhost:5001/day/close", {
//         method: "POST",
//         headers: { Authorization: authHeader },
//       });

//       const data = await res.json();

//       if (!res.ok) {
//         if (data.reason === "JUSTIFICATION_REQUIRED") {
//           setNeedsJustification(true);
//           setShortageProducts(data.products || []);
//           return;
//         }
//         throw new Error("Unable to close day");
//       }

//       fetchDayStatus();
//     } catch (err) {
//       alert(err.message);
//     } finally {
//       setLoadingAction(false);
//     }
//   };

//   /* =========================
//      SUBMIT JUSTIFICATION
//   ========================= */
//   const submitJustification = async () => {
//     if (!justification.trim()) {
//       alert("Please enter justification");
//       return;
//     }

//     try {
//       setLoadingAction(true);

//       const res = await fetch("http://localhost:5001/day/close", {
//         method: "POST",
//         headers: {
//           Authorization: authHeader,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ justification }),
//       });

//       if (!res.ok) {
//         throw new Error("Failed to submit justification");
//       }

//       setNeedsJustification(false);
//       setShortageProducts([]);
//       setJustification("");
//       fetchDayStatus();
//     } catch (err) {
//       alert(err.message);
//     } finally {
//       setLoadingAction(false);
//     }
//   };

//   /* =========================
//      RENDER
//   ========================= */
//   return (
//     <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
//       {/* HEADER */}
//       <div
//         style={{
//           background: "#1e293b",
//           color: "#fff",
//           padding: "12px 16px",
//           flexShrink: 0,
//         }}
//       >
//         <h2 style={{ marginBottom: 4 }}>Plant Management</h2>
//         <p style={{ fontSize: 13 }}>{formattedDateTime}</p>

//         <div
//           style={{
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             marginTop: 8,
//           }}
//         >
//           <div>
//             <strong>Role:</strong> {role} &nbsp; | &nbsp;
//             <strong>Status:</strong> {dayStatus}
//           </div>

//           <button onClick={onLogout}>Logout</button>
//         </div>

//         {isAdminPlus && (
//           <div style={{ marginTop: 8 }}>
//             {dayStatus === "OPEN" && (
//               <button onClick={handleCloseDay} disabled={loadingAction}>
//                 Close Day
//               </button>
//             )}
//             {dayStatus === "CLOSED" && !hasDayRecord && (
//               <button onClick={handleOpenDay} disabled={loadingAction}>
//                 Open Day
//               </button>
//             )}
//           </div>
//         )}
//       </div>

//       {/* CONTENT */}
//       <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
//         <div className="dashboard-grid">
//           <Card icon="💳" title="Billing" onClick={() => onNavigate("billing")} />
//           <Card icon="📒" title="Ledger" onClick={() => onNavigate("ledger")} />
//           <Card icon="📊" title="Monthly Ledger" onClick={() => onNavigate("monthlyLedger")} />
//           <Card icon="🧾" title="Invoices" onClick={() => onNavigate("invoices")} />

//           {isAdminPlus && (
//             <>
//               <Card icon="📦" title="Daily Stock" onClick={() => onNavigate("dailyStock")} />
//               <Card icon="🔄" title="Stock Reconciliation" onClick={() => onNavigate("stockReconciliation")} />
//               <Card icon="👥" title="Customers" onClick={() => onNavigate("customers")} />
//               <Card icon="💰" title="Customer Pricing" onClick={() => onNavigate("customerPricing")} />
//               <Card icon="🧺" title="Products" onClick={() => onNavigate("products")} />
//               <Card icon="👤" title="Users" onClick={() => onNavigate("users")} />
//               <Card icon="🛡️" title="Audit Log" onClick={() => onNavigate("audit")} />
//             </>
//           )}
//         </div>

//         {/* JUSTIFICATION UI (SAFE, ISOLATED) */}
//         {needsJustification && (
//           <div className="card" style={{ marginTop: 20 }}>
//             <h3>Stock Shortage Justification Required</h3>

//             <ul>
//               {shortageProducts.map((p) => (
//                 <li key={p.product_id}>
//                   {p.product_name} — shortage: {p.shortage}
//                 </li>
//               ))}
//             </ul>

//             <textarea
//               placeholder="Enter justification..."
//               value={justification}
//               onChange={(e) => setJustification(e.target.value)}
//               style={{ width: "100%", marginTop: 8 }}
//             />

//             <button
//               onClick={submitJustification}
//               disabled={loadingAction}
//               style={{ marginTop: 8 }}
//             >
//               Submit Justification
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// function Card({ icon, title, onClick }) {
//   return (
//     <div className="dashboard-card" onClick={onClick}>
//       <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
//       <span>{title}</span>
//     </div>
//   );
// }

// export default Dashboard;


// // import { useEffect, useState } from "react";
// // import { jwtDecode } from "jwt-decode";

// // function Dashboard({ onNavigate, onLogout }) {
// //   const [dayStatus, setDayStatus] = useState("LOADING");
// //   const [hasDayRecord, setHasDayRecord] = useState(false);
// //   const [loadingAction, setLoadingAction] = useState(false);

// //   /* =========================
// //      LIVE DATE & TIME
// //   ========================= */
// //   const [now, setNow] = useState(new Date());

// //   useEffect(() => {
// //     const interval = setInterval(() => {
// //       setNow(new Date());
// //     }, 30000);
// //     return () => clearInterval(interval);
// //   }, []);

// //   const formattedDateTime = now.toLocaleString("en-IN", {
// //     weekday: "long",
// //     day: "2-digit",
// //     month: "short",
// //     year: "numeric",
// //     hour: "2-digit",
// //     minute: "2-digit",
// //   });

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

// //   const isAdminPlus = role === "admin" || role === "super_admin";

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
// //       await fetch("http://localhost:5001/day/open", {
// //         method: "POST",
// //         headers: { Authorization: authHeader },
// //       });
// //       fetchDayStatus();
// //     } finally {
// //       setLoadingAction(false);
// //     }
// //   };

// //   const handleCloseDay = async () => {
// //     if (!window.confirm("Are you sure you want to CLOSE the day?")) return;
// //     try {
// //       setLoadingAction(true);
// //       await fetch("http://localhost:5001/day/close", {
// //         method: "POST",
// //         headers: { Authorization: authHeader },
// //       });
// //       fetchDayStatus();
// //     } finally {
// //       setLoadingAction(false);
// //     }
// //   };

// //   /* =========================
// //      RENDER
// //   ========================= */
// //   return (
// //     <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
// //       {/* =========================
// //          FIXED HEADER (REAL FIX)
// //       ========================= */}
// //       <div
// //         style={{
// //           background: "#1e293b",
// //           color: "#fff",
// //           padding: "12px 16px",
// //           flexShrink: 0,
// //         }}
// //       >
// //         <h2 style={{ marginBottom: 4 }}>Plant Management</h2>
// //         <p style={{ fontSize: 13 }}>{formattedDateTime}</p>

// //         <div
// //           style={{
// //             display: "flex",
// //             justifyContent: "space-between",
// //             alignItems: "center",
// //             marginTop: 8,
// //           }}
// //         >
// //           <div>
// //             <strong>Role:</strong> {role} &nbsp; | &nbsp;
// //             <strong>Status:</strong> {dayStatus}
// //           </div>

// //           <button onClick={onLogout}>Logout</button>
// //         </div>

// //         {isAdminPlus && (
// //           <div style={{ marginTop: 8 }}>
// //             {dayStatus === "OPEN" && (
// //               <button onClick={handleCloseDay} disabled={loadingAction}>
// //                 Close Day
// //               </button>
// //             )}
// //             {dayStatus === "CLOSED" && !hasDayRecord && (
// //               <button onClick={handleOpenDay} disabled={loadingAction}>
// //                 Open Day
// //               </button>
// //             )}
// //           </div>
// //         )}
// //       </div>

// //       {/* =========================
// //          SCROLLABLE CONTENT
// //       ========================= */}
// //       <div
// //         style={{
// //           flex: 1,
// //           overflowY: "auto",
// //           padding: 16,
// //         }}
// //       >
// //         <div className="dashboard-grid">
// //           <Card icon="💳" title="Billing" onClick={() => onNavigate("billing")} />
// //           <Card icon="📒" title="Ledger" onClick={() => onNavigate("ledger")} />
// //           <Card icon="📊" title="Monthly Ledger" onClick={() => onNavigate("monthlyLedger")} />
// //           <Card icon="🧾" title="Invoices" onClick={() => onNavigate("invoices")} />

// //           {isAdminPlus && (
// //             <>
// //               <Card icon="📦" title="Daily Stock" onClick={() => onNavigate("dailyStock")} />
// //               <Card icon="🔄" title="Stock Reconciliation" onClick={() => onNavigate("stockReconciliation")} />
// //               <Card icon="👥" title="Customers" onClick={() => onNavigate("customers")} />
// //               <Card icon="💰" title="Customer Pricing" onClick={() => onNavigate("customerPricing")} />
// //               <Card icon="🧺" title="Products" onClick={() => onNavigate("products")} />
// //               <Card icon="👤" title="Users" onClick={() => onNavigate("users")} />
// //               <Card icon="🛡️" title="Audit Log" onClick={() => onNavigate("audit")} />
// //             </>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

// // function Card({ icon, title, onClick }) {
// //   return (
// //     <div className="dashboard-card" onClick={onClick}>
// //       <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
// //       <span>{title}</span>
// //     </div>
// //   );
// // }

// // export default Dashboard;

