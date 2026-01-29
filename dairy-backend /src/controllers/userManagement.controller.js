const { query } = require("../config/db");
const bcrypt = require("bcrypt");
const { logAudit } = require("../utils/auditLogger");

/**
 * CREATE USER
 * super_admin → admin, vendor
 * admin       → vendor
 */
const createUser = async (req, res) => {
  try {
    const requester = req.user;
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // ❌ vendor cannot create users
    if (requester.role === "vendor") {
      return res.status(403).json({ message: "Forbidden" });
    }

    // ❌ nobody can create super_admin
    if (role === "super_admin") {
      return res.status(403).json({ message: "Cannot create super admin" });
    }

    // ✅ admin can create only vendor
    if (requester.role === "admin" && role !== "vendor") {
      return res.status(403).json({ message: "Admin can create vendor only" });
    }

    // ✅ super_admin can create admin or vendor
    if (
      requester.role === "super_admin" &&
      role !== "admin" &&
      role !== "vendor"
    ) {
      return res.status(403).json({ message: "Invalid role assignment" });
    }

    const existing = await query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await query(
      `INSERT INTO users (username, password_hash, role)
       VALUES ($1, $2, $3)`,
      [username, password_hash, role]
    );

    logAudit({
      user: requester,
      action: "CREATE_USER",
      entity: "user",
      entity_id: username,
      details: {
        created_role: role,
      },
    });

    return res.status(201).json({
      message: `${role} user created successfully`,
    });
  } catch (err) {
    console.error("CREATE USER ERROR:", err);
    return res.status(500).json({ message: "Failed to create user" });
  }
};

/**
 * RESET PASSWORD
 */
const resetPassword = async (req, res) => {
  try {
    const requester = req.user;
    const { user_id, new_password } = req.body;

    if (!user_id || !new_password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (requester.role === "vendor") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const userResult = await query(
      "SELECT id, role FROM users WHERE id = $1",
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const target = userResult.rows[0];

    // ❌ admin can reset only vendor
    if (requester.role === "admin" && target.role !== "vendor") {
      return res.status(403).json({ message: "Not allowed" });
    }

    // ❌ super_admin cannot reset super_admin
    if (requester.role === "super_admin" && target.role === "super_admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    const password_hash = await bcrypt.hash(new_password, 10);

    await query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [password_hash, user_id]
    );

    logAudit({
      user: requester,
      action: "RESET_PASSWORD",
      entity: "user",
      entity_id: user_id,
      details: {
        target_role: target.role,
      },
    });

    return res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({ message: "Failed to reset password" });
  }
};


/**
 * ENABLE / DISABLE USER (with FULL audit details)
 */
const toggleUserStatus = async (req, res) => {
  try {
    const requester = req.user;
    const { user_id, is_active } = req.body;

    if (requester.role === "vendor") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (typeof is_active !== "boolean") {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const userResult = await query(
      `
      SELECT id, username, role, is_active
      FROM users
      WHERE id = $1
      `,
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const target = userResult.rows[0];

    // 🔒 Role hierarchy enforcement
    if (requester.role === "admin" && target.role !== "vendor") {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (requester.role === "super_admin" && target.role === "super_admin") {
      return res.status(403).json({ message: "Not allowed" });
    }

    // If no actual change, skip update
    if (target.is_active === is_active) {
      return res.json({ message: "No status change required" });
    }

    // Update user status
    await query(
      `
      UPDATE users
      SET is_active = $1
      WHERE id = $2
      `,
      [is_active, user_id]
    );

    // 🔍 Audit log with FULL details
    await query(
      `
      INSERT INTO audit_logs
        (action, entity, entity_id, role, details)
      VALUES
        ($1, 'user', $2, $3, $4)
      `,
      [
        is_active ? "ENABLE_USER" : "DISABLE_USER",
        target.id,
        requester.role,
        JSON.stringify({
          target_user_id: target.id,
          target_username: target.username,
          target_role: target.role,
          old_status: target.is_active,
          new_status: is_active,
        }),
      ]
    );

    return res.json({
      message: `User ${is_active ? "enabled" : "disabled"} successfully`,
    });
  } catch (err) {
    console.error("TOGGLE USER ERROR:", err);
    return res.status(500).json({ message: "Failed to update user status" });
  }
};

// /**
//  * ENABLE / DISABLE USER
//  */
// const toggleUserStatus = async (req, res) => {
//   try {
//     const requester = req.user;
//     const { user_id, is_active } = req.body;

//     if (requester.role === "vendor") {
//       return res.status(403).json({ message: "Forbidden" });
//     }

//     const userResult = await query(
//       "SELECT id, role FROM users WHERE id = $1",
//       [user_id]
//     );

//     if (userResult.rows.length === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const target = userResult.rows[0];

//     if (requester.role === "admin" && target.role !== "vendor") {
//       return res.status(403).json({ message: "Not allowed" });
//     }

//     if (requester.role === "super_admin" && target.role === "super_admin") {
//       return res.status(403).json({ message: "Not allowed" });
//     }

//     await query(
//       "UPDATE users SET is_active = $1 WHERE id = $2",
//       [is_active, user_id]
//     );


//     logAudit({
//       user: requester,
//       action: is_active ? "ENABLE_USER" : "DISABLE_USER",
//       entity: "user",
//       entity_id: user_id,
//       details: {
//         target_role: target.role,
//       },
//     });


//     return res.json({ message: "User status updated" });
//   } catch (err) {
//     console.error("TOGGLE USER ERROR:", err);
//     return res.status(500).json({ message: "Failed to update user" });
//   }
// };

/**
 * Get users list (role-aware)
 */
const getUsers = async (req, res) => {
  try {
    const requester = req.user;

    let queryText;
    let params = [];

    if (requester.role === "super_admin") {
      // super_admin can see admin + vendor
      queryText = `
        SELECT id, username, role, is_active
        FROM users
        WHERE role IN ('admin', 'vendor')
        ORDER BY role, username
      `;
    }
    else if (requester.role === "admin") {
      // admin can see vendor only
      queryText = `
        SELECT id, username, role, is_active
        FROM users
        WHERE role = 'vendor'
        ORDER BY username
      `;
    }
    else {
      return res.status(403).json({ message: "Forbidden" });
    }

    const result = await query(queryText, params);

    return res.json({ users: result.rows });
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
};

module.exports = {
  createUser,
  resetPassword,
  toggleUserStatus,
  getUsers,
};

// const { query } = require("../config/db");
// const bcrypt = require("bcrypt");

// /**
//  * Create user (Admin creates Vendor, Super Admin creates Admin)
//  */
// const createUser = async (req, res) => {
//   try {
//     const requester = req.user;
//     const { username, password, role } = req.body;

//     if (!username || !password || !role) {
//       return res.status(400).json({ message: "Missing fields" });
//     }

//     // Hierarchy enforcement
//     if (
//       (requester.role === "super_admin" && role !== "admin") ||
//       (requester.role === "admin" && role !== "vendor")
//     ) {
//       return res.status(403).json({ message: "Invalid role assignment" });
//     }

//     const existing = await query(
//       "SELECT id FROM users WHERE username = $1",
//       [username]
//     );

//     if (existing.rows.length > 0) {
//       return res.status(400).json({ message: "Username already exists" });
//     }

//     const password_hash = await bcrypt.hash(password, 10);

//     await query(
//       `INSERT INTO users (username, password_hash, role)
//        VALUES ($1, $2, $3)`,
//       [username, password_hash, role]
//     );

//     return res.status(201).json({
//       message: `${role} user created successfully`,
//     });
//   } catch (err) {
//     console.error("CREATE USER ERROR:", err);
//     return res.status(500).json({ message: "Failed to create user" });
//   }
// };

// /**
//  * Reset password (only for lower roles)
//  */
// const resetPassword = async (req, res) => {
//   try {
//     const requester = req.user;
//     const { user_id, new_password } = req.body;

//     if (!user_id || !new_password) {
//       return res.status(400).json({ message: "Missing fields" });
//     }

//     const userResult = await query(
//       "SELECT id, role FROM users WHERE id = $1",
//       [user_id]
//     );

//     if (userResult.rows.length === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const target = userResult.rows[0];

//     // Enforce hierarchy
//     if (
//       (requester.role === "super_admin" && target.role !== "admin") ||
//       (requester.role === "admin" && target.role !== "vendor")
//     ) {
//       return res.status(403).json({ message: "Not allowed" });
//     }

//     const password_hash = await bcrypt.hash(new_password, 10);

//     await query(
//       "UPDATE users SET password_hash = $1 WHERE id = $2",
//       [password_hash, user_id]
//     );

//     return res.json({ message: "Password reset successfully" });
//   } catch (err) {
//     console.error("RESET PASSWORD ERROR:", err);
//     return res.status(500).json({ message: "Failed to reset password" });
//   }
// };

// /**
//  * Enable / Disable user
//  */
// const toggleUserStatus = async (req, res) => {
//   try {
//     const requester = req.user;
//     const { user_id, is_active } = req.body;

//     const userResult = await query(
//       "SELECT id, role FROM users WHERE id = $1",
//       [user_id]
//     );

//     if (userResult.rows.length === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const target = userResult.rows[0];

//     if (
//       (requester.role === "super_admin" && target.role !== "admin") ||
//       (requester.role === "admin" && target.role !== "vendor")
//     ) {
//       return res.status(403).json({ message: "Not allowed" });
//     }

//     await query(
//       "UPDATE users SET is_active = $1 WHERE id = $2",
//       [is_active, user_id]
//     );

//     return res.json({ message: "User status updated" });
//   } catch (err) {
//     console.error("TOGGLE USER ERROR:", err);
//     return res.status(500).json({ message: "Failed to update user" });
//   }
// };

// module.exports = {
//   createUser,
//   resetPassword,
//   toggleUserStatus,
// };