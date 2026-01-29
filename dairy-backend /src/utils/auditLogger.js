const { query } = require("../config/db");

/**
 * Append-only audit logger
 * NEVER throws error to caller
 */
const logAudit = async ({
  user,
  action,
  entity,
  entity_id = null,
  details = {},
}) => {
  try {
    if (!user) return;

    await query(
      `
      INSERT INTO audit_logs
        (user_id, role, action, entity, entity_id, details)
      VALUES
        ($1, $2, $3, $4, $5, $6)
      `,
      [
        user.id,
        user.role,
        action,
        entity,
        entity_id,
        JSON.stringify(details),
      ]
    );
  } catch (err) {
    // ❗ audit logging must NEVER break main flow
    console.error("AUDIT LOG ERROR:", err.message);
  }
};

module.exports = { logAudit };