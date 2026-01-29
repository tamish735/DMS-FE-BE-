const express = require("express");
const router = express.Router();
const { greetUser, greetUserPost, testDb } = require("../controllers/greet.controller");



const authMiddleware = require("../middleware/auth.middleware");

router.get("/greet", authMiddleware, greetUser);
router.post("/greet", greetUserPost);
router.get("/test-db", testDb);

module.exports = router;