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
            payment_mode: row.payment_mode,
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
    <div className="page-container">
      {/* =========================
         FIXED TOP SECTION
      ========================= */}
      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Customer Ledger</h3>

        <label>Customer</label>
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

      {/* =========================
         SCROLLABLE CONTENT AREA
      ========================= */}
      <div
        className="card"
        style={{
          height: "calc(100vh - 220px)",
          overflowY: "auto",
        }}
      >
        {loading && <p>Loading ledger...</p>}

        {!loading && ledger.length > 0 && (
          <table>
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
                      <span style={{ color: "#555", fontSize: 12 }}>
                        {" "}
                        ({row.payment_mode.toUpperCase()})
                      </span>
                    )}
                  </td>

                  <td>{row.debit > 0 ? row.debit.toFixed(2) : "-"}</td>
                  <td>{row.credit > 0 ? row.credit.toFixed(2) : "-"}</td>
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
    </div>
  );
}

export default Ledger;