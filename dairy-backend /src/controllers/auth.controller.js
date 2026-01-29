const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { query } = require("../config/db");

const login = async (req, res) => {
  const { username, password } = req.body;

  /* =========================
     1. Validate input
  ========================= */
  if (!username || !password) {
    return res.status(400).json({
      message: "Username and password are required",
    });
  }

  try {
    /* =========================
       2. Fetch user from DB
       ⛔ INCLUDE is_active
    ========================= */
    const result = await query(
      `
      SELECT
        id,
        username,
        password_hash,
        role,
        is_active
      FROM users
      WHERE username = $1
      `,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    const user = result.rows[0];

    /* =========================
       3. BLOCK DISABLED USERS
       🚫 THIS WAS MISSING
    ========================= */
    if (user.is_active === false) {
      return res.status(403).json({
        message: "Your account has been disabled. Please contact admin.",
      });
    }

    /* =========================
       4. Verify password
    ========================= */
    const isMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    /* =========================
       5. Issue JWT
    ========================= */
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      message: "Login successful",
      token,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  login,
};