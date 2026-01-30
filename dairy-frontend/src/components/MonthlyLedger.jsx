import { useEffect, useState } from "react";

function MonthlyLedger() {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [month, setMonth] = useState("");

  const [rows, setRows] = useState([]);
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

        if (!res.ok) throw new Error("Failed to load ledger");
        const data = await res.json();

        setRows(Array.isArray(data.rows) ? data.rows : []);
        setSummary(data.summary || null);
        setProductSummary(
          Array.isArray(data.product_summary) ? data.product_summary : []
        );
      } catch (err) {
        setError(err.message);
        setRows([]);
        setSummary(null);
        setProductSummary([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, [customerId, month]);

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  return (
    <>
      {/* FILTERS – NORMAL FLOW */}
      <div className="card">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
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
        </div>
      </div>

      {loading && <p>Loading ledger...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {summary && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
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
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Total Qty</th>
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
        </>
      )}

      {rows.length > 0 && (
        <>
          <h4 style={{ marginTop: 20 }}>Ledger Entries</h4>
          <div className="table-scroll">
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
          </div>
        </>
      )}

      {!loading && customerId && month && rows.length === 0 && (
        <p>No ledger entries found.</p>
      )}
    </>
  );
}

export default MonthlyLedger;

