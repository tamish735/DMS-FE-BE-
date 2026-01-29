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
     FETCH LEDGER (JSON)
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
        setProductSummary(Array.isArray(data.product_summary) ? data.product_summary : []);
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
     DOWNLOAD HELPER
  ========================= */
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
     EXPORT CSV
  ========================= */
  const exportCSV = async () => {
    if (!customerId || !month) {
      alert("Select customer and month first");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5001/reports/customer-ledger/export?customer_id=${customerId}&month=${month}`,
        { headers: { Authorization: authHeader } }
      );

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "CSV export failed");
      }

      const blob = await res.blob();
      downloadBlob(blob, `customer_${customerId}_${month}.csv`);
    } catch (err) {
      alert(err.message || "CSV export failed");
    }
  };

  /* =========================
     EXPORT PDF
  ========================= */
  const exportPDF = async () => {
    if (!customerId || !month) {
      alert("Select customer and month first");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:5001/reports/customer-ledger/pdf?customer_id=${customerId}&month=${month}`,
        { headers: { Authorization: authHeader } }
      );

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "PDF export failed");
      }

      const blob = await res.blob();
      downloadBlob(blob, `customer_${customerId}_${month}.pdf`);
    } catch (err) {
      alert(err.message || "PDF export failed");
    }
  };

  /* =========================
     FORMATTERS
  ========================= */
  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  /* =========================
     RENDER
  ========================= */
  return (
    <div style={{ marginTop: 24, padding: 16, border: "1px solid #ddd" }}>
      <h3>Monthly Customer Ledger</h3>

      {/* FILTERS */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <label>Customer</label><br />
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Month</label><br />
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
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

      {/* SUMMARY SECTION */}
      {summary && (
        <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ border: "1px solid #ccc", padding: 12 }}>
            <strong>Total Sales</strong>
            <div>₹ {summary.total_sales}</div>
          </div>

          <div style={{ border: "1px solid #ccc", padding: 12 }}>
            <strong>Total Payments</strong>
            <div>₹ {summary.total_payments}</div>
          </div>

          <div style={{ border: "1px solid #ccc", padding: 12 }}>
            <strong>Closing Balance</strong>
            <div>₹ {summary.closing_balance}</div>
          </div>
        </div>
      )}

      {/* PRODUCT SUMMARY */}
      {productSummary.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h4>Product-wise Summary</h4>
          <table width="100%" border="1" cellPadding="6">
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
        </div>
      )}

      {/* STATUS */}
      {loading && <p>Loading ledger...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* LEDGER TABLE */}
      {!loading && rows.length > 0 && (
        <table width="100%" border="1" cellPadding="6">
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
      )}

      {!loading && customerId && month && rows.length === 0 && (
        <p>No ledger entries found.</p>
      )}
    </div>
  );
}

export default MonthlyLedger;