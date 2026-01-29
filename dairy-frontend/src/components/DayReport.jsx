import { useEffect, useState } from "react";

function DayReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch("http://localhost:5001/reports/day", {
          headers: {
            Authorization: token.startsWith("Bearer ")
              ? token
              : `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to fetch report");
        }

        setReport(data);
      } catch (err) {
        setError(err.message || "Unable to fetch day report");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, []);

  if (loading) {
    return <p>Loading day-end report...</p>;
  }

  if (error) {
    return <p style={{ color: "orange" }}>{error}</p>;
  }

  if (!report) return null;

  return (
    <div
      style={{
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        marginTop: "24px",
        backgroundColor: "#0c0101ff",
      }}
    >
      <h3>Day-End Report</h3>

      {report.status === "OPEN" && (
        <p style={{ color: "orange", marginBottom: "12px" }}>
          ⚠️ Day is still OPEN. Figures are provisional.
        </p>
      )}

      <p><strong>Date:</strong> {report.business_date}</p>
      <p><strong>Status:</strong> {report.status}</p>

      <hr />

      <p><strong>Total Sales:</strong> ₹{report.total_sales}</p>
      <p><strong>Cash Collected:</strong> ₹{report.cash_collected}</p>
      <p><strong>Online Collected:</strong> ₹{report.online_collected}</p>
      <p><strong>Total Collected:</strong> ₹{report.total_collected}</p>

      <hr />

      <p>
        <strong>Net Due Change:</strong>{" "}
        <span style={{ color: report.net_due_change > 0 ? "red" : "green" }}>
          ₹{report.net_due_change}
        </span>
      </p>
    </div>
  );
}

export default DayReport;