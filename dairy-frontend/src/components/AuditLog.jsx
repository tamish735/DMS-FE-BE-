import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";

function AuditLog() {
  /* =========================
     STATE
  ========================= */
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* =========================
     AUTH
  ========================= */
  const token = localStorage.getItem("token");
  const authHeader = token?.startsWith("Bearer ")
    ? token
    : token
    ? `Bearer ${token}`
    : "";

  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      setRole(decoded.role || null);
    } catch {
      setRole(null);
    }
  }, [token]);

  const isSuperAdmin = role === "super_admin";

  /* =========================
     FETCH LOGS
  ========================= */
  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }

    const fetchLogs = async () => {
      try {
        const res = await fetch("http://localhost:5001/audit-logs", {
          headers: { Authorization: authHeader },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        setLogs(Array.isArray(data.logs) ? data.logs : []);
      } catch (err) {
        setError(err.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [isSuperAdmin, authHeader]);

  /* =========================
     FILTER HELPERS
  ========================= */
  const actions = useMemo(
    () => [...new Set(logs.map((l) => l.action))],
    [logs]
  );
  const entities = useMemo(
    () => [...new Set(logs.map((l) => l.entity))],
    [logs]
  );
  const roles = useMemo(
    () => [...new Set(logs.map((l) => l.role))],
    [logs]
  );

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter && log.action !== actionFilter) return false;
      if (entityFilter && log.entity !== entityFilter) return false;
      if (roleFilter && log.role !== roleFilter) return false;

      const logDate = new Date(log.created_at).toISOString().slice(0, 10);
      if (fromDate && logDate < fromDate) return false;
      if (toDate && logDate > toDate) return false;

      return true;
    });
  }, [logs, actionFilter, entityFilter, roleFilter, fromDate, toDate]);

  const resetFilters = () => {
    setActionFilter("");
    setEntityFilter("");
    setRoleFilter("");
    setFromDate("");
    setToDate("");
  };

  const formatTime = (ts) =>
    new Date(ts).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (!isSuperAdmin) return null;
  if (loading) return <p>Loading audit logs...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  /* =========================
     RENDER (MATCHES MONTHLY LEDGER)
  ========================= */
  return (
    <>
      {/* =========================
         FILTERS (ALWAYS VISIBLE)
      ========================= */}
      <div className="card">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
          }}
        >
          <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="">Action</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
            <option value="">Entity</option>
            {entities.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">Role</option>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

          <button onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {/* =========================
         SCROLLABLE DATA AREA
      ========================= */}
      <div
        className="card"
        style={{
          height: "calc(100vh - 240px)", // same idea as MonthlyLedger
          overflow: "auto",
        }}
      >
        {filteredLogs.length === 0 && <p>No audit activity found.</p>}

        {filteredLogs.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Role</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatTime(log.created_at)}</td>
                    <td>{log.action}</td>
                    <td>{log.entity} #{log.entity_id}</td>
                    <td>{log.role}</td>
                    <td>
                      <pre style={{ margin: 0 }}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default AuditLog;