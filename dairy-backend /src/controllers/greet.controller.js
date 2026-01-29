// GET /greet
const greetUser = (req, res) => {
  const name = req.query.name;
  res.send(`Hello ${name}`);
};

// POST /greet
const greetUserPost = (req, res) => {
  const name = req.body.name;

  if (!name) {
    return res.status(400).json({
      message: "Name is required"
    });
  }

  res.status(200).json({
    message: `Hello ${name}`
  });
};

module.exports = {
  greetUser,
  greetUserPost
};

const { query } = require("../config/db");

const testDb = async (req, res) => {
  try {
    const result = await query("SELECT * FROM users");
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "DB error" });
  }
};

module.exports = {
  greetUser,
  greetUserPost,
  testDb
};