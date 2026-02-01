// Load environment variables FIRST
require("dotenv").config();

// Validate required environment variables
const REQUIRED_ENVS = [
  "PORT",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_SECRET",
];

const missing = REQUIRED_ENVS.filter((key) => !process.env[key]);
if (missing.length) {
  console.error("❌ Missing required environment variables:");
  missing.forEach((k) => console.error(`   - ${k}`));
  process.exit(1);
}

// Import app AFTER env is validated
const app = require("./app");

const PORT = process.env.PORT || 5001;

// Bind to 0.0.0.0 so server is reachable externally
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});