import { useEffect, useState } from "react";

function Ledger() {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;

  /* =========================
     FETCH CUSTOMERS
  ========================= */
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("http://localhost:5001/customers/active", {
          headers: { Authorization: authHeader },
        });
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : []);
      } catch {
        setCustomers([]);
      }
    };

    fetchCustomers();
  }, [authHeader]);

  /* =========================
     FETCH LEDGER
  ========================= */
  const fetchLedger = async (id) => {
    if (!id) return;

    try {
      setLoading(true);

      const res = await fetch(
        `http://localhost:5001/ledger/customer/${id}`,
        {
          headers: { Authorization: authHeader },
        }
      );

      const data = await res.json();

      const normalized = Array.isArray(data.ledger)
        ? data.ledger.map((row) => ({
            date: row.date,
            type: row.type,
            payment_mode: row.payment_mode, // ✅ NEW
            debit: Number(row.debit || 0),
            credit: Number(row.credit || 0),
            balance: Number(row.balance || 0),
            notes: row.notes,
          }))
        : [];

      setLedger(normalized);
    } catch {
      setLedger([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h3>Customer Ledger</h3>

      {/* CUSTOMER SELECT */}
      <div style={{ marginBottom: "12px" }}>
        <label>Customer</label>
        <br />
        <select
          value={customerId}
          onChange={(e) => {
            const id = e.target.value;
            setCustomerId(id);
            fetchLedger(id);
          }}
        >
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* LOADING */}
      {loading && <p>Loading ledger...</p>}

      {/* LEDGER TABLE */}
      {!loading && ledger.length > 0 && (
        <table
          border="1"
          cellPadding="6"
          style={{ width: "100%", marginTop: "12px" }}
        >
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Debit (₹)</th>
              <th>Credit (₹)</th>
              <th>Balance (₹)</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((row, index) => (
              <tr key={index}>
                <td>{new Date(row.date).toLocaleString()}</td>

                <td>
                  {row.type}
                  {row.type === "PAYMENT" && row.payment_mode && (
                    <span style={{ color: "#555", fontSize: "12px" }}>
                      {" "}
                      ({row.payment_mode.toUpperCase()})
                    </span>
                  )}
                </td>

                <td>
                  {row.debit > 0 ? row.debit.toFixed(2) : "-"}
                </td>

                <td>
                  {row.credit > 0 ? row.credit.toFixed(2) : "-"}
                </td>

                <td>{row.balance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && customerId && ledger.length === 0 && (
        <p>No ledger entries for this customer.</p>
      )}
    </div>
  );
}

export default Ledger;


// import { useEffect, useState } from "react";

// function Ledger() {
//     console.log("Ledger.jsx file loaded");
//     const [customers, setCustomers] = useState([]);
//     const [customerId, setCustomerId] = useState("");
//     const [ledger, setLedger] = useState([]);
//     const [loading, setLoading] = useState(false);

//     const token = localStorage.getItem("token");

//     // =========================
//     // Fetch customers
//     // =========================
//     useEffect(() => {
//         const fetchCustomers = async () => {
//             try {
//                 const res = await fetch("http://localhost:5001/customers/active", {
//                     headers: {
//                         Authorization: token.startsWith("Bearer ")
//                             ? token
//                             : `Bearer ${token}`,
//                     },
//                 });

//                 const data = await res.json();
//                 setCustomers(Array.isArray(data) ? data : []);
//             } catch (err) {
//                 setCustomers([]);
//             }
//         };

//         fetchCustomers();
//     }, [token]);

//     // =========================
//     // Fetch ledger for customer
//     // =========================
//     const fetchLedger = async (id) => {
//         console.log("fetchLedger called with id:", id);

//         if (!id) {
//             console.log("No customer id provided");
//             return;
//         }

//         try {
//             const res = await fetch(
//                 `http://localhost:5001/ledger/customer/${id}`,
//                 {
//                     headers: {
//                         Authorization: token.startsWith("Bearer ")
//                             ? token
//                             : `Bearer ${token}`,
//                     },
//                 }
//             );

//             console.log("Ledger fetch status:", res.status);

//             const data = await res.json();
//             console.log("Ledger API response data:", data);

//             // setLedger(Array.isArray(data.ledger) ? data.ledger : []);
//             const normalized = Array.isArray(data.ledger)
//                 ? data.ledger.map((row) => ({
//                     date: row.date,
//                     type: row.type,
//                     debit: Number(row.debit || 0),
//                     credit: Number(row.credit || 0),
//                     balance: Number(row.balance || 0),
//                 }))
//                 : [];

//             setLedger(normalized);
//         } catch (err) {
//             console.error("Ledger fetch failed:", err);
//             setLedger([]);
//         }
//     };
  
//     return (
//         <div
//             style={{
//                 marginTop: "20px",
//                 padding: "16px",
//                 border: "1px solid #ddd",
//                 borderRadius: "8px",
//             }}
//         >
//             <h3>Customer Ledger</h3>

//             {/* Customer Selector */}
//             <div style={{ marginBottom: "12px" }}>
//                 <label>Customer</label>
//                 <br />
//                 <select
//                     value={customerId}
//                     onChange={(e) => {
//                         const id = e.target.value;
//                         setCustomerId(id);
//                         fetchLedger(id);
//                     }}
//                 >
//                     <option value="">Select customer</option>
//                     {customers.map((c) => (
//                         <option key={c.id} value={c.id}>
//                             {c.name}
//                         </option>
//                     ))}
//                 </select>
//             </div>

//             {/* Ledger Table */}
//             {loading && <p>Loading ledger...</p>}

//             {!loading && ledger.length > 0 && (
//                 <table
//                     border="1"
//                     cellPadding="6"
//                     style={{ width: "100%", marginTop: "12px" }}
//                 >
//                     <thead>
//                         <tr>
//                             <th>Date</th>
//                             <th>Type</th>
//                             <th>Debit (₹)</th>
//                             <th>Credit (₹)</th>
//                             <th>Balance (₹)</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {ledger.map((row, index) => (
//                             <tr key={index}>
//                                 <td>{new Date(row.date).toLocaleString()}</td>
//                                 <td>{row.type}</td>
//                                 <td>
//                                     {Number(row.debit) > 0 ? Number(row.debit).toFixed(2) : "-"}
//                                 </td>

//                                 <td>
//                                     {Number(row.credit) > 0 ? Number(row.credit).toFixed(2) : "-"}
//                                 </td>

//                                 <td>
//                                     {Number(row.balance).toFixed(2)}
//                                 </td>
//                             </tr>
//                         ))}
//                     </tbody>
//                 </table>
//             )}

//             {!loading && customerId && ledger.length === 0 && (
//                 <p>No ledger entries for this customer.</p>
//             )}
//         </div>
//     );
// }

// export default Ledger; 