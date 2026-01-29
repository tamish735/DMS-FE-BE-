const { query } = require("../config/db");

/**
 * GET AUDIT LOGS (ADMIN / SUPER ADMIN)
 * Supports filtering by:
 * - action
 * - entity
 * - role
 * - date range (from, to)
 */
const getAuditLogs = async (req, res) => {
  try {
    const user = req.user;

    // 🔐 HARD BACKEND GUARD
    if (user.role !== "admin" && user.role !== "super_admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    /* =========================
       FILTERS (ALL OPTIONAL)
    ========================= */
    const { action, entity, role, from, to } = req.query;

    const conditions = [];
    const values = [];

    if (action) {
      values.push(action);
      conditions.push(`action = $${values.length}`);
    }

    if (entity) {
      values.push(entity);
      conditions.push(`entity = $${values.length}`);
    }

    if (role) {
      values.push(role);
      conditions.push(`role = $${values.length}`);
    }

    if (from) {
      values.push(from);
      conditions.push(`created_at >= $${values.length}`);
    }

    if (to) {
      values.push(`${to} 23:59:59`);
      conditions.push(`created_at <= $${values.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    /* =========================
       QUERY
    ========================= */
    const result = await query(
      `
      SELECT
        id,
        action,
        entity,
        entity_id,
        role,
        details,
        created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 200
      `,
      values
    );

    return res.json({
      filters_applied: {
        action: action || null,
        entity: entity || null,
        role: role || null,
        from: from || null,
        to: to || null,
      },
      logs: result.rows,
    });
  } catch (err) {
    console.error("AUDIT LOG FETCH ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch audit logs" });
  }
};

module.exports = {
  getAuditLogs,
};