const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser,
    adminLogin,
    getMe
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const { authRateLimiter } = require("../middleware/rateLimiter");

// Public routes with rate limiting
router.post("/register", authRateLimiter(30, 15), registerUser);
router.post("/login", authRateLimiter(30, 15), loginUser);
router.post("/admin/login", authRateLimiter(20, 15), adminLogin);

// Protected route
router.get("/me", protect, getMe);

module.exports = router;
