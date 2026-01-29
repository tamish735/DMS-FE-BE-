import { useEffect, useState } from "react";

function StockReconciliation({ refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;

  const fetchReconciliation = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "http://localhost:5001/stock/reconciliation",
        {
          headers: { Authorization: authHeader },
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      setData(result);
    } catch (err) {
      setError(err.message || "Failed to fetch reconciliation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, [refreshKey]);

  if (loading) return <p>Loading stock reconciliation…</p>;
  if (error) return <p style={{ color: "orange" }}>{error}</p>;
  if (!data) return null;

  return (
    <div
      style={{
        marginTop: 24,
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 8,
      }}
    >
      <h3>Stock Reconciliation</h3>

      {data.has_shortage && (
        <div
          style={{
            backgroundColor: "#ffecec",
            padding: 12,
            borderRadius: 6,
            marginBottom: 12,
            color: "#b30000",
            fontWeight: "bold",
          }}
        >
          ⚠️ Stock mismatch detected. Justification is required before closing
          the day.
        </div>
      )}

      <table
        border="1"
        cellPadding="8"
        width="100%"
        style={{ borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th>Product</th>
            <th>Total Opening</th>
            <th>Counter Opening</th>
            <th>Sold</th>
            <th>Counter Closing</th>
            <th>Returned</th>
            <th>Shortage / Excess</th>
          </tr>
        </thead>

        <tbody>
          {data.products.map((p) => {
            const ok = p.shortage === 0;

            return (
              <tr
                key={p.product_id}
                style={{
                  backgroundColor: ok ? "#f6fff6" : "#fff3f3",
                }}
              >
                <td>{p.product_name}</td>

                <td align="right">
                  <strong>{p.total_opening_stock}</strong>
                </td>

                <td align="right">{p.counter_opening}</td>

                <td align="right">{p.sold_qty}</td>

                <td align="right">{p.counter_closing}</td>

                <td align="right">{p.returned_to_plant}</td>

                <td
                  align="right"
                  style={{
                    fontWeight: "bold",
                    color: ok ? "green" : "red",
                  }}
                >
                  {p.shortage}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default StockReconciliation;









// import { useEffect, useState } from "react";

// function StockReconciliation({ refreshKey }) {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const token = localStorage.getItem("token");

//   const fetchReconciliation = async () => {
//     try {
//       const res = await fetch("http://localhost:5001/stock/reconciliation", {
//         headers: {
//           Authorization: token.startsWith("Bearer ")
//             ? token
//             : `Bearer ${token}`,
//         },
//       });

//       const result = await res.json();

//       if (!res.ok) {
//         throw new Error(result.message || "Failed to fetch reconciliation");
//       }

//       setData(result);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchReconciliation();
//   }, [refreshKey]);

//   if (loading) return <p>Loading stock reconciliation...</p>;
//   if (error) return <p style={{ color: "orange" }}>{error}</p>;
//   if (!data) return null;

//   return (
//     <div
//       style={{
//         marginTop: "24px",
//         padding: "16px",
//         border: "1px solid #ddd",
//         borderRadius: "8px",
//       }}
//     >
//       <h3>Stock Reconciliation</h3>

//       {data.has_shortage && (
//         <div
//           style={{
//             backgroundColor: "#ffffffff",
//             padding: "12px",
//             borderRadius: "6px",
//             marginBottom: "12px",
//             color: "#b30000",
//           }}
//         >
//           ⚠️ Stock mismatch detected. Please verify shortages.
//         </div>
//       )}

//       <table
//         border="1"
//         cellPadding="8"
//         style={{ width: "100%", borderCollapse: "collapse" }}
//       >
//         <thead>
//           <tr>
//             <th>Product</th>
//             <th>Opening Stock</th>
//             <th>Sold</th>
//             <th>Counter Closing</th>
//             <th>Returned</th>
//             <th>Shortage</th>
//           </tr>
//         </thead>
//         <tbody>
//           {data.products.map((p) => (
//             <tr
//               key={p.product_id}
//               style={{
//                 backgroundColor:
//                   p.shortage === 0 ? "#000000ff" : "#000000ff",
//               }}
//             >
//               <td>{p.product_name}</td>
//               <td>{p.opening_stock}</td>
//               <td>{p.sold_qty}</td>
//               <td>{p.counter_closing}</td>
//               <td>{p.returned_to_plant}</td>
//               <td
//                 style={{
//                   fontWeight: "bold",
//                   color: p.shortage === 0 ? "green" : "red",
//                 }}
//               >
//                 {p.shortage}
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// export default StockReconciliation;