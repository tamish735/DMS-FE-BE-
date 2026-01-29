import { useEffect, useState } from "react";

function CustomerSummary() {
  const [summary, setSummary] = useState(null);

  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : `Bearer ${token}`;

  useEffect(() => {
    fetch("http://localhost:5001/summary/customer", {
      headers: { Authorization: authHeader },
    })
      .then(res => res.json())
      .then(data => setSummary(data))
      .catch(() => setSummary(null));
  }, []);

  if (!summary) return <p>Loading customer summary...</p>;

  return (
    <div style={{ border: "1px solid #ccc", padding: "16px", marginTop: "16px" }}>
      <h3>Customer Summary</h3>

      <p><strong>Customers billed today:</strong> {summary.billed_today}</p>
      <p><strong>Customers with due:</strong> {summary.customers_with_due}</p>
      <p><strong>Total due amount:</strong> ₹{summary.total_due}</p>
    </div>
  );
}

export default CustomerSummary;