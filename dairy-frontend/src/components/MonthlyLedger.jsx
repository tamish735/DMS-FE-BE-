import { useEffect, useState } from "react";

function MonthlyLedger() {
  /* =========================
     STATE
  ========================= */
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [month, setMonth] = useState("");

  const [rows, setRows] = useState([]);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  const [productSummary, setProductSummary] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        const res = await fetch("http://localhost:5001/customers", {
          headers: { Authorization: authHeader },
        });

        if (!res.ok) throw new Error();
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data : []);
      } catch {
        setError("Failed to load customers");
      }
    };

    fetchCustomers();
  }, []);

  /* =========================
     FETCH LEDGER
  ========================= */
  useEffect(() => {
    if (!customerId || !month) {
      setRows([]);
      setCustomerInfo(null);
      setSummary(null);
      setProductSummary([]);
      return;
    }

    const fetchLedger = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `http://localhost:5001/reports/customer-ledger?customer_id=${customerId}&month=${month}`,
          { headers: { Authorization: authHeader } }
        );

        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || "Failed to load ledger");
        }

        const data = await res.json();

        setRows(Array.isArray(data.rows) ? data.rows : []);
        setCustomerInfo(data.customer || null);
        setSummary(data.summary || null);
        setProductSummary(
          Array.isArray(data.product_summary) ? data.product_summary : []
        );
      } catch (err) {
        setError(err.message || "Failed to load ledger");
        setRows([]);
        setCustomerInfo(null);
        setSummary(null);
        setProductSummary([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, [customerId, month]);

  /* =========================
     HELPERS
  ========================= */
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  /* =========================
     EXPORTS
  ========================= */
  const exportCSV = async () => {
    if (!customerId || !month) {
      alert("Select customer and month first");
      return;
    }

    const res = await fetch(
      `http://localhost:5001/reports/customer-ledger/export?customer_id=${customerId}&month=${month}`,
      { headers: { Authorization: authHeader } }
    );

    if (!res.ok) {
      alert("CSV export failed");
      return;
    }

    const blob = await res.blob();
    downloadBlob(blob, `customer_${customerId}_${month}.csv`);
  };

  const exportPDF = async () => {
    if (!customerId || !month) {
      alert("Select customer and month first");
      return;
    }

    const res = await fetch(
      `http://localhost:5001/reports/customer-ledger/pdf?customer_id=${customerId}&month=${month}`,
      { headers: { Authorization: authHeader } }
    );

    if (!res.ok) {
      alert("PDF export failed");
      return;
    }

    const blob = await res.blob();
    downloadBlob(blob, `customer_${customerId}_${month}.pdf`);
  };

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="page-container">
      {/* =========================
         FIXED HEADER / FILTERS
      ========================= */}
      <div className="card">
        {/* <h3>Monthly Customer Ledger</h3> */}

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
          <div>
            <label>Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          <div style={{ alignSelf: "flex-end", display: "flex", gap: 8 }}>
            <button onClick={exportCSV} disabled={loading || rows.length === 0}>
              Export CSV
            </button>
            <button onClick={exportPDF} disabled={loading || rows.length === 0}>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* =========================
         SCROLLABLE CONTENT
      ========================= */}
      <div
        className="card"
        style={{
          height: "calc(100vh - 240px)",
          overflowY: "auto",
        }}
      >
        {loading && <p>Loading ledger...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}

        {summary && (
          <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
            <div className="card">
              <strong>Total Sales</strong>
              <div>₹ {summary.total_sales}</div>
            </div>
            <div className="card">
              <strong>Total Payments</strong>
              <div>₹ {summary.total_payments}</div>
            </div>
            <div className="card">
              <strong>Closing Balance</strong>
              <div>₹ {summary.closing_balance}</div>
            </div>
          </div>
        )}

        {productSummary.length > 0 && (
          <>
            <h4>Product-wise Summary</h4>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Total Quantity</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {productSummary.map((p, i) => (
                  <tr key={i}>
                    <td>{p.product_name}</td>
                    <td align="right">{p.total_quantity}</td>
                    <td align="right">₹ {p.total_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {!loading && rows.length > 0 && (
          <>
            <h4 style={{ marginTop: 20 }}>Ledger Entries</h4>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{fmtDate(r.date)}</td>
                    <td>{r.type}</td>
                    <td>{r.product || "-"}</td>
                    <td align="right">{r.quantity ?? "-"}</td>
                    <td align="right">{r.debit ?? "-"}</td>
                    <td align="right">{r.credit ?? "-"}</td>
                    <td align="right">{r.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {!loading && customerId && month && rows.length === 0 && (
          <p>No ledger entries found.</p>
        )}
      </div>
    </div>
  );
}

export default MonthlyLedger;