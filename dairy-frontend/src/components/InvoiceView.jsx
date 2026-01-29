// import { useEffect, useState } from "react";

// function InvoiceView({ invoiceId, onClose }) {
//   const [invoice, setInvoice] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const token = localStorage.getItem("token");
//   const authHeader = token?.startsWith("Bearer ")
//     ? token
//     : `Bearer ${token}`;

//   useEffect(() => {
//     if (!invoiceId) return;

//     const fetchInvoice = async () => {
//       try {
//         const res = await fetch(
//           `http://localhost:5001/invoice/${invoiceId}`,
//           {
//             headers: { Authorization: authHeader },
//           }
//         );

//         const data = await res.json();
//         if (!res.ok) throw new Error(data.message);

//         setInvoice(data);
//       } catch (err) {
//         setError(err.message || "Failed to load invoice");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchInvoice();
//   }, [invoiceId]);

//   if (!invoiceId) return null;
//   if (loading) return <p>Loading invoice...</p>;
//   if (error) return <p style={{ color: "red" }}>{error}</p>;

//   return (
//     <div
//       style={{
//         position: "fixed",
//         inset: 0,
//         background: "rgba(0,0,0,0.4)",
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         zIndex: 2000,
//       }}
//     >
//       <div
//         style={{
//           background: "#fff",
//           padding: "20px",
//           width: "360px",
//           maxHeight: "90vh",
//           overflowY: "auto",
//           borderRadius: "8px",
//           fontSize: "14px",
//         }}
//       >
//         {/* HEADER */}
//         <div style={{ textAlign: "center", marginBottom: "12px" }}>
//           <h3 style={{ margin: 0 }}>Invoice</h3>
//           <small>{invoice.invoice_id}</small>
//         </div>

//         {/* META */}
//         <p><strong>Date:</strong> {invoice.business_date}</p>
//         <p><strong>Customer:</strong> {invoice.customer.name}</p>

//         <hr />

//         {/* ITEMS */}
//         <table width="100%" cellPadding="4">
//           <thead>
//             <tr>
//               <th align="left">Item</th>
//               <th align="right">Qty</th>
//               <th align="right">Amt</th>
//             </tr>
//           </thead>
//           <tbody>
//             {invoice.items.map((i, idx) => (
//               <tr key={idx}>
//                 <td>{i.product_name}</td>
//                 <td align="right">{i.quantity}</td>
//                 <td align="right">₹{i.amount.toFixed(2)}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//         <hr />

//         {/* SUMMARY */}
//         <p><strong>Subtotal:</strong> ₹{invoice.summary.subtotal}</p>
//         <p>Cash Paid: ₹{invoice.summary.cash_paid}</p>
//         <p>Online Paid: ₹{invoice.summary.online_paid}</p>
//         <p><strong>Due:</strong> ₹{invoice.summary.due}</p>

//         <hr />

//         {/* ACTIONS */}
//         <div style={{ display: "flex", gap: "8px" }}>
//           <button onClick={() => window.print()} style={{ flex: 1 }}>
//             Print
//           </button>
//           <button onClick={onClose} style={{ flex: 1 }}>
//             Close
//           </button>
//         </div>

//         <p style={{ marginTop: "10px", fontSize: "11px", color: "gray" }}>
//           This invoice is system-generated and cannot be edited.
//         </p>
//       </div>
//     </div>
//   );
// }

// export default InvoiceView;





import { useEffect, useState } from "react";

function InvoiceView({ invoiceId, onClose }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;

  useEffect(() => {
    if (!invoiceId) return;

    const fetchInvoice = async () => {
      try {
        const res = await fetch(
          `http://localhost:5001/invoice/${invoiceId}`,
          { headers: { Authorization: authHeader } }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        setInvoice(data);
      } catch (err) {
        setError(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [invoiceId]);

  if (!invoiceId) return null;
  if (loading) return <p>Loading invoice...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <>
      {/* PRINT STYLES */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .invoice-print,
            .invoice-print * {
              visibility: visible;
            }
            .invoice-print {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 2000,
        }}
      >
        <div
          className="invoice-print"
          style={{
            background: "#fff",
            padding: "20px",
            width: "360px",
            maxHeight: "90vh",
            overflowY: "auto",
            borderRadius: "8px",
            fontSize: "14px",
          }}
        >
          {/* HEADER */}
          <div style={{ textAlign: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0 }}>DAIRY INVOICE</h3>
            <small>{invoice.invoice_id}</small>
          </div>

          {/* META */}
          <p><strong>Date:</strong> {invoice.business_date}</p>
          <p><strong>Customer:</strong> {invoice.customer.name}</p>

          <hr />

          {/* ITEMS */}
          <table width="100%" cellPadding="4">
            <thead>
              <tr>
                <th align="left">Item</th>
                <th align="right">Qty</th>
                <th align="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((i, idx) => (
                <tr key={idx}>
                  <td>{i.product_name}</td>
                  <td align="right">{i.quantity}</td>
                  <td align="right">₹{i.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr />

          {/* SUMMARY */}
          <p><strong>Subtotal:</strong> ₹{invoice.summary.subtotal}</p>
          <p>Cash Paid: ₹{invoice.summary.cash_paid}</p>
          <p>Online Paid: ₹{invoice.summary.online_paid}</p>
          <p><strong>Due:</strong> ₹{invoice.summary.due}</p>

          <hr />

          {/* ACTIONS */}
          <div className="no-print" style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => window.print()} style={{ flex: 1 }}>
              Print
            </button>
            <button onClick={onClose} style={{ flex: 1 }}>
              Close
            </button>
          </div>

          <p
            style={{
              marginTop: "10px",
              fontSize: "11px",
              color: "gray",
              textAlign: "center",
            }}
          >
            This invoice is system-generated and cannot be edited.
          </p>
        </div>
      </div>
    </>
  );
}

export default InvoiceView;