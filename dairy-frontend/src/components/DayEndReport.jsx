import { useEffect, useState } from "react";

function DayEndReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch("http://localhost:5001/day/report", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Unable to fetch day-end report");
        }

        const data = await res.json();
        setReport(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  if (loading) return <p>Loading Day-End Report...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!report) return null;

  const { financials, products, customers_summary } = report;

  return (
    <div style={{ marginTop: "32px" }}>
      <h3>Day-End Report</h3>

      <p>
        <strong>Date:</strong> {report.business_date} <br />
        <strong>Status:</strong> {report.day_status}
      </p>

      {/* Financial Summary */}
      <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
        <SummaryCard label="Total Sales" value={financials.total_sales} />
        <SummaryCard label="Cash Collected" value={financials.cash_collected} />
        <SummaryCard label="Online Collected" value={financials.online_collected} />
        <SummaryCard
          label="Net Due Change"
          value={financials.net_due_change}
          highlight={financials.net_due_change > 0}
        />
      </div>

      {/* Product Table */}
      <h4 style={{ marginTop: "24px" }}>Product Stock Summary</h4>
      <table border="1" cellPadding="8" style={{ width: "100%", marginTop: "8px" }}>
        <thead>
          <tr>
            <th>Product</th>
            <th>Opening</th>
            <th>Sold</th>
            <th>Counter Closing</th>
            <th>Returned</th>
            <th>Shortage</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.product_id}>
              <td>{p.product_name}</td>
              <td>{p.opening_stock}</td>
              <td>{p.sold_quantity}</td>
              <td>{p.counter_closing_stock}</td>
              <td>{p.returned_to_plant}</td>
              <td style={{ color: p.calculated_shortage !== 0 ? "red" : "green" }}>
                {p.calculated_shortage}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Customer Summary */}
      <h4 style={{ marginTop: "24px" }}>Customer Summary</h4>
      <ul>
        <li>Customers billed: {customers_summary.customers_billed}</li>
        <li>Customers with due: {customers_summary.total_customers_with_due}</li>
        <li>Total due amount: ₹{customers_summary.total_due_amount}</li>
      </ul>
    </div>
  );
}

/* Small reusable card */
function SummaryCard({ label, value, highlight }) {
  return (
    <div
      style={{
        padding: "12px",
        border: "1px solid #ccc",
        borderRadius: "8px",
        minWidth: "160px",
        backgroundColor: highlight ? "#fff3f3" : "#f9f9f9",
      }}
    >
      <strong>{label}</strong>
      <p style={{ fontSize: "18px", marginTop: "4px" }}>₹{value}</p>
    </div>
  );
}

export default DayEndReport;