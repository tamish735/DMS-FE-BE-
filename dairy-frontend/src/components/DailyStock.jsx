import { useEffect, useState } from "react";

function DailyStock({ onStockSaved }) {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;

  /* =========================
     FETCH DAILY STOCK (SERVER STATE)
  ========================= */
  const fetchStocks = async () => {
    try {
      const res = await fetch("http://localhost:5001/stock/daily", {
        headers: { Authorization: authHeader },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setRows(data.stocks || []);
      setDraft({}); // clear drafts after fetch
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  /* =========================
     DRAFT UPDATE (NO SIDE EFFECTS)
  ========================= */
  const updateDraft = (productId, field, value) => {
    setDraft(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value,
      },
    }));
  };

  /* =========================
     CONFIRM MORNING STOCK
  ========================= */
  const saveMorningStock = async (row) => {
    const d = draft[row.product_id] || {};

    const plantLoad = Number(d.plant_load_qty);
    const counterOpening = Number(d.counter_opening_qty);
    const prevClosing = Number(row.yesterday_counter_closing || 0);

    if ([plantLoad, counterOpening].some(v => isNaN(v) || v < 0)) {
      alert("Enter valid Plant Load and Counter Opening");
      return;
    }

    if (counterOpening > plantLoad + prevClosing) {
      alert("Counter opening cannot exceed total opening stock");
      return;
    }

    const confirm = window.confirm(
      `Confirm MORNING STOCK for ${row.product_name}\n\n` +
      `Yesterday Counter Closing: ${prevClosing}\n` +
      `Plant Load Today: ${plantLoad}\n` +
      `Total Opening: ${plantLoad + prevClosing}\n` +
      `Counter Opening: ${counterOpening}\n\n` +
      `This action CANNOT be edited. Proceed?`
    );

    if (!confirm) return;

    try {
      setSavingId(row.product_id);

      const res = await fetch("http://localhost:5001/stock/daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          product_id: row.product_id,
          plant_load_qty: plantLoad,
          counter_opening_qty: counterOpening,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      fetchStocks();
      onStockSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingId(null);
    }
  };

  /* =========================
     CONFIRM CLOSING STOCK
  ========================= */
  const saveClosingStock = async (row) => {
    const d = draft[row.product_id] || {};

    const counterClosing = Number(d.counter_closing_qty);
    const returned = Number(d.returned_to_plant_qty);

    if ([counterClosing, returned].some(v => isNaN(v) || v < 0)) {
      alert("Enter valid closing values");
      return;
    }

    const confirm = window.confirm(
      `Confirm CLOSING STOCK for ${row.product_name}\n\n` +
      `Counter Closing: ${counterClosing}\n` +
      `Returned: ${returned}\n\n` +
      `This action CANNOT be edited. Proceed?`
    );

    if (!confirm) return;

    try {
      setSavingId(row.product_id);

      const res = await fetch("http://localhost:5001/stock/daily", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          product_id: row.product_id,
          counter_closing_qty: counterClosing,
          returned_to_plant_qty: returned,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      fetchStocks();
      onStockSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <p>Loading daily stock…</p>;
  if (error) return <p style={{ color: "orange" }}>{error}</p>;

  return (
    <div style={{ padding: 16, border: "1px solid #ddd", marginTop: 24 }}>
      <h3>Daily Product Stock Entry</h3>

      <table border="1" cellPadding="8" width="100%">
        <thead>
          <tr>
            <th>Product</th>
            <th>Yesterday Closing</th>
            <th>Plant Load</th>
            <th>Counter Opening</th>
            <th>Counter Closing</th>
            <th>Returned</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {rows.map(row => {
            const morningLocked =
              row.plant_load_qty !== null &&
              row.counter_opening_qty !== null;

            const closingLocked =
              row.counter_closing_qty !== null &&
              row.returned_to_plant_qty !== null;

            const d = draft[row.product_id] || {};

            return (
              <tr key={row.product_id}>
                <td>{row.product_name}</td>
                <td align="right">{row.yesterday_counter_closing ?? 0}</td>

                <td>
                  <input
                    type="number"
                    disabled={morningLocked}
                    value={d.plant_load_qty ?? ""}
                    onChange={e =>
                      updateDraft(row.product_id, "plant_load_qty", e.target.value)
                    }
                  />
                </td>

                <td>
                  <input
                    type="number"
                    disabled={morningLocked}
                    value={d.counter_opening_qty ?? ""}
                    onChange={e =>
                      updateDraft(row.product_id, "counter_opening_qty", e.target.value)
                    }
                  />
                </td>

                <td>
                  <input
                    type="number"
                    disabled={!morningLocked || closingLocked}
                    value={d.counter_closing_qty ?? ""}
                    onChange={e =>
                      updateDraft(row.product_id, "counter_closing_qty", e.target.value)
                    }
                  />
                </td>

                <td>
                  <input
                    type="number"
                    disabled={!morningLocked || closingLocked}
                    value={d.returned_to_plant_qty ?? ""}
                    onChange={e =>
                      updateDraft(row.product_id, "returned_to_plant_qty", e.target.value)
                    }
                  />
                </td>

                <td>
                  {!morningLocked && (
                    <button onClick={() => saveMorningStock(row)}>
                      Confirm Morning
                    </button>
                  )}

                  {morningLocked && !closingLocked && (
                    <button onClick={() => saveClosingStock(row)}>
                      Confirm Closing
                    </button>
                  )}

                  {morningLocked && closingLocked && (
                    <span style={{ color: "green" }}>✔ Locked</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DailyStock;

// import { useEffect, useState } from "react";

// function DailyStock({ onStockSaved }) {
//   const [stocks, setStocks] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [savingId, setSavingId] = useState(null);
//   const [savedRows, setSavedRows] = useState({});
//   const [error, setError] = useState("");

//   const token = localStorage.getItem("token");
//   const authHeader = token?.startsWith("Bearer ")
//     ? token
//     : `Bearer ${token}`;

//   /* =========================
//      FETCH DAILY STOCK
//   ========================= */
//   const fetchStocks = async () => {
//     try {
//       const res = await fetch("http://localhost:5001/stock/daily", {
//         headers: { Authorization: authHeader },
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       setStocks(data.stocks || []);

//       const saved = {};
//       (data.stocks || []).forEach((r) => {
//         if (
//           r.plant_load_qty !== null &&
//           r.counter_opening_qty !== null &&
//           r.counter_closing_qty !== null &&
//           r.returned_to_plant_qty !== null
//         ) {
//           saved[r.product_id] = true;
//         }
//       });
//       setSavedRows(saved);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchStocks();
//   }, []);

//   /* =========================
//      UPDATE FIELD
//   ========================= */
//   const updateField = (productId, field, value) => {
//     setStocks((prev) =>
//       prev.map((row) =>
//         row.product_id === productId
//           ? { ...row, [field]: value }
//           : row
//       )
//     );
//   };

//   /* =========================
//      SAVE STOCK (CONFIRMED)
//   ========================= */
//   const saveStock = async (row) => {
//     if (savedRows[row.product_id]) return;

//     const plantLoad = Number(row.plant_load_qty);
//     const counterOpening = Number(row.counter_opening_qty);
//     const counterClosing = Number(row.counter_closing_qty);
//     const returned = Number(row.returned_to_plant_qty);

//     if (
//       [plantLoad, counterOpening, counterClosing, returned].some(
//         (v) => isNaN(v) || v < 0
//       )
//     ) {
//       alert("All quantities must be entered correctly");
//       return;
//     }

//     const totalOpening =
//       Number(row.yesterday_counter_closing || 0) + plantLoad;

//     const confirm = window.confirm(
//       `Confirm stock entry for ${row.product_name}\n\n` +
//         `Plant Load: ${plantLoad}\n` +
//         `Yesterday Counter Closing: ${row.yesterday_counter_closing || 0}\n` +
//         `Total Opening Stock: ${totalOpening}\n` +
//         `Counter Opening Given: ${counterOpening}\n` +
//         `Counter Closing: ${counterClosing}\n` +
//         `Returned to Plant: ${returned}\n\n` +
//         `This action CANNOT be edited. Proceed?`
//     );

//     if (!confirm) return;

//     try {
//       setSavingId(row.product_id);

//       const payload = {
//         product_id: row.product_id,
//         plant_load_qty: plantLoad,
//         counter_opening_qty: counterOpening,
//         counter_closing_qty: counterClosing,
//         returned_to_plant_qty: returned,
//       };

//       const res = await fetch("http://localhost:5001/stock/daily", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: authHeader,
//         },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       setSavedRows((prev) => ({
//         ...prev,
//         [row.product_id]: true,
//       }));

//       fetchStocks();
//       onStockSaved();
//     } catch (err) {
//       alert(err.message);
//     } finally {
//       setSavingId(null);
//     }
//   };

//   if (loading) return <p>Loading daily stock...</p>;
//   if (error) return <p style={{ color: "orange" }}>{error}</p>;

//   return (
//     <div style={{ padding: 16, border: "1px solid #ddd", marginTop: 24 }}>
//       <h3>Daily Product Stock Entry</h3>

//       <table border="1" cellPadding="8" width="100%">
//         <thead>
//           <tr>
//             <th>Product</th>
//             <th>Yesterday Counter Closing</th>
//             <th>Plant Load</th>
//             <th>Total Opening (Auto)</th>
//             <th>Counter Opening</th>
//             <th>Counter Closing</th>
//             <th>Returned to Plant</th>
//             <th>Action</th>
//           </tr>
//         </thead>

//         <tbody>
//           {stocks.map((row) => {
//             const totalOpening =
//               Number(row.yesterday_counter_closing || 0) +
//               Number(row.plant_load_qty || 0);

//             const disabled = savedRows[row.product_id];

//             return (
//               <tr key={row.product_id}>
//                 <td>{row.product_name}</td>

//                 <td align="right">
//                   {row.yesterday_counter_closing ?? 0}
//                 </td>

//                 <td>
//                   <input
//                     type="number"
//                     value={row.plant_load_qty ?? ""}
//                     disabled={disabled}
//                     onChange={(e) =>
//                       updateField(
//                         row.product_id,
//                         "plant_load_qty",
//                         e.target.value
//                       )
//                     }
//                   />
//                 </td>

//                 <td align="right">
//                   <strong>{totalOpening}</strong>
//                 </td>

//                 <td>
//                   <input
//                     type="number"
//                     value={row.counter_opening_qty ?? ""}
//                     disabled={disabled}
//                     onChange={(e) =>
//                       updateField(
//                         row.product_id,
//                         "counter_opening_qty",
//                         e.target.value
//                       )
//                     }
//                   />
//                 </td>

//                 <td>
//                   <input
//                     type="number"
//                     value={row.counter_closing_qty ?? ""}
//                     disabled={disabled}
//                     onChange={(e) =>
//                       updateField(
//                         row.product_id,
//                         "counter_closing_qty",
//                         e.target.value
//                       )
//                     }
//                   />
//                 </td>

//                 <td>
//                   <input
//                     type="number"
//                     value={row.returned_to_plant_qty ?? ""}
//                     disabled={disabled}
//                     onChange={(e) =>
//                       updateField(
//                         row.product_id,
//                         "returned_to_plant_qty",
//                         e.target.value
//                       )
//                     }
//                   />
//                 </td>

//                 <td>
//                   {disabled ? (
//                     <span style={{ color: "green" }}>✔ Locked</span>
//                   ) : (
//                     <button
//                       onClick={() => saveStock(row)}
//                       disabled={savingId === row.product_id}
//                     >
//                       {savingId === row.product_id
//                         ? "Saving..."
//                         : "Confirm & Save"}
//                     </button>
//                   )}
//                 </td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// export default DailyStock;




// import { useEffect, useState } from "react";

// function DailyStock({ onStockSaved }) {
//   const [stocks, setStocks] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [savingId, setSavingId] = useState(null);
//   const [savedPlantLoad, setSavedPlantLoad] = useState({});
//   const [error, setError] = useState("");

//   const token = localStorage.getItem("token");
//   const authHeader = token?.startsWith("Bearer ")
//     ? token
//     : `Bearer ${token}`;

//   /* =========================
//      FETCH DAILY STOCK
//   ========================= */
//   const fetchStocks = async () => {
//     try {
//       const res = await fetch("http://localhost:5001/stock/daily", {
//         headers: { Authorization: authHeader },
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       setStocks(data.stocks || []);

//       const saved = {};
//       (data.stocks || []).forEach((r) => {
//         if (r.plant_load_qty !== null) {
//           saved[r.product_id] = true;
//         }
//       });
//       setSavedPlantLoad(saved);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchStocks();
//   }, []);

//   /* =========================
//      UPDATE FIELD
//   ========================= */
//   const updateField = (productId, field, value) => {
//     setStocks((prev) =>
//       prev.map((row) =>
//         row.product_id === productId
//           ? { ...row, [field]: value }
//           : row
//       )
//     );
//   };

//   /* =========================
//      SAVE STOCK — FINAL LOGIC
//   ========================= */
//   const saveStock = async (row) => {
//     try {
//       setSavingId(row.product_id);

//       const isMorning = !savedPlantLoad[row.product_id];

//       const plantLoad =
//         row.plant_load_qty === "" ? null : Number(row.plant_load_qty);

//       const counterClosing =
//         row.counter_closing_qty === "" ? null : Number(row.counter_closing_qty);

//       const returned =
//         row.returned_to_plant_qty === ""
//           ? null
//           : Number(row.returned_to_plant_qty);

//       const payload = { product_id: row.product_id };

//       /* ===== MORNING MODE ===== */
//       if (isMorning) {
//         if (plantLoad === null) {
//           alert("Enter Plant Load");
//           setSavingId(null);
//           return;
//         }
//         payload.plant_load_qty = plantLoad;
//       }

//       /* ===== CLOSING MODE ===== */
//       else {
//         if (counterClosing === null || returned === null) {
//           alert("Enter Counter Closing and Returned quantity");
//           setSavingId(null);
//           return;
//         }
//         payload.counter_closing_qty = counterClosing;
//         payload.returned_to_plant_qty = returned;
//       }

//       const res = await fetch("http://localhost:5001/stock/daily", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: authHeader,
//         },
//         body: JSON.stringify(payload),
//       });

//       const data = await res.json();
//       if (!res.ok) throw new Error(data.message);

//       setSavedPlantLoad((prev) => ({
//         ...prev,
//         [row.product_id]: true,
//       }));

//       fetchStocks();
//       onStockSaved();
//     } catch (err) {
//       alert(err.message);
//     } finally {
//       setSavingId(null);
//     }
//   };

//   if (loading) return <p>Loading daily stock...</p>;
//   if (error) return <p style={{ color: "orange" }}>{error}</p>;

//   return (
//     <div style={{ padding: "16px", border: "1px solid #ddd", marginTop: "24px" }}>
//       <h3>Daily Product Stock Entry</h3>

//       <table border="1" cellPadding="8" width="100%">
//         <thead>
//           <tr>
//             <th>Product</th>
//             <th>Plant Load</th>
//             <th>Counter Closing</th>
//             <th>Returned</th>
//             <th>Action</th>
//           </tr>
//         </thead>

//         <tbody>
//           {stocks.map((row) => (
//             <tr key={row.product_id}>
//               <td>{row.product_name}</td>

//               <td>
//                 <input
//                   type="number"
//                   value={row.plant_load_qty ?? ""}
//                   disabled={savedPlantLoad[row.product_id]}
//                   onChange={(e) =>
//                     updateField(
//                       row.product_id,
//                       "plant_load_qty",
//                       e.target.value
//                     )
//                   }
//                 />
//                 {savedPlantLoad[row.product_id] && (
//                   <div style={{ fontSize: 12, color: "green" }}>✔ Saved</div>
//                 )}
//               </td>

//               <td>
//                 <input
//                   type="number"
//                   value={row.counter_closing_qty ?? ""}
//                   onChange={(e) =>
//                     updateField(
//                       row.product_id,
//                       "counter_closing_qty",
//                       e.target.value
//                     )
//                   }
//                 />
//               </td>

//               <td>
//                 <input
//                   type="number"
//                   value={row.returned_to_plant_qty ?? ""}
//                   onChange={(e) =>
//                     updateField(
//                       row.product_id,
//                       "returned_to_plant_qty",
//                       e.target.value
//                     )
//                   }
//                 />
//               </td>

//               <td>
//                 <button
//                   onClick={() => saveStock(row)}
//                   disabled={savingId === row.product_id}
//                 >
//                   {savingId === row.product_id ? "Saving..." : "Save"}
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// export default DailyStock;