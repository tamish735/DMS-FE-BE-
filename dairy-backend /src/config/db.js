const { Pool } = require("pg");

const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "tamishshrivastava",
  password: "",       // leave empty if no password
  database: "dairy_db"
});

const query = (text, params) => {
  return pool.query(text, params);
};

module.exports = {
  query
};