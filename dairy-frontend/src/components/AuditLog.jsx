import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";

function AuditLog() {
  /* =========================
     STATE
  ========================= */
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* FILTERS */
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* =========================
     AUTH + ROLE
  ========================= */
  const token = localStorage.getItem("token");

  const authHeader = token?.startsWith("Bearer ")
    ? token
    : token
    ? `Bearer ${token}`
    : "";

  const [role, setRole] = useState(null);

  useEffect(() => {
    if (!token) return setRole(null);
    try {
      const decoded = jwtDecode(token);
      setRole(decoded.role || null);
    } catch {
      setRole(null);
    }
  }, [token]);

  const isSuperAdmin = role === "super_admin";

  /* =========================
     FETCH AUDIT LOGS
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
     UNIQUE VALUES FOR FILTERS
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

  /* =========================
     FILTERED LOGS
  ========================= */
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

  /* =========================
     HELPERS
  ========================= */
  const formatTime = (ts) =>
    new Date(ts).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const resetFilters = () => {
    setActionFilter("");
    setEntityFilter("");
    setRoleFilter("");
    setFromDate("");
    setToDate("");
  };

  /* =========================
     GUARDS
  ========================= */
  if (!isSuperAdmin) return null;
  if (loading) return <p>Loading audit logs...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ marginTop: 20, padding: 16, border: "1px solid #ddd" }}>
      <h3>Audit Logs</h3>

      {/* FILTER BAR */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
          <option value="">All Actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
          <option value="">All Entities</option>
          {entities.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>

        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />

        <button onClick={resetFilters}>View All</button>
      </div>

      {/* TABLE */}
      {filteredLogs.length === 0 && <p>No audit activity found.</p>}

      {filteredLogs.length > 0 && (
        <table width="100%" border="1" cellPadding="6" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Actor Role</th>
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
                  <pre style={{ margin: 0, fontSize: 12 }}>
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AuditLog;