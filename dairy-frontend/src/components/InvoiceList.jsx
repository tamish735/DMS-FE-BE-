import { useEffect, useState } from "react";
import InvoiceView from "./InvoiceView";

function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;

  /* =========================
     FETCH INVOICES
  ========================= */
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await fetch("http://localhost:5001/invoices", {
          headers: { Authorization: authHeader },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load invoices");

        setInvoices(Array.isArray(data.invoices) ? data.invoices : []);
      } catch (err) {
        setError(err.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) return <p>Loading invoices...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="page-container">
      {/* HEADER CARD */}
      <div className="card">
        <h3>Invoices</h3>
      </div>

      {/* 🔑 SCROLL CONTAINER (VERTICAL + HORIZONTAL) */}
      <div
        className="card"
        style={{
          height: "calc(100vh - 200px)",
          overflow: "auto",        // ✅ BOTH directions enabled
        }}
      >
        {invoices.length === 0 && <p>No invoices found.</p>}

        {invoices.length > 0 && (
          <table
            style={{
              minWidth: "900px",    // 🔑 FORCE horizontal overflow
            }}
          >
            <thead>
              <tr>
                <th align="left">Invoice</th>
                <th align="left">Business Date</th>
                <th align="left">Customer</th>
                <th align="right">Total (₹)</th>
                <th align="center">View</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.invoice_id}>
                  <td>{inv.invoice_id}</td>
                  <td>{formatDate(inv.business_date)}</td>
                  <td>{inv.customer_name}</td>
                  <td align="right">
                    {Number(inv.total_amount).toFixed(2)}
                  </td>
                  <td align="center">
                    <button
                      onClick={() => setSelectedInvoice(inv.invoice_id)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {selectedInvoice && (
        <InvoiceView
          invoiceId={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}

export default InvoiceList;