const express = require("express");
const router = express.Router();

const {
    getAdminStats,
    getAdminUsers,
    toggleUserStatus,
    deleteUser,
    getAdminSkills,
    approveSkill,
    removeSkill,
    restoreSkill,
    getAdminExchanges,
    getAdminSessions,
    getAdminActivities,
    getReports,
    submitReport,
    reviewReport,
    resolveReport,
    deleteReport
} = require("../controllers/adminController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// Report submission (can be submitted by any authenticated user)
router.post("/reports", protect, submitReport);

// All routes below require Admin authorization
router.use(protect, adminOnly);

// Platform Overview Stats
router.get("/stats", getAdminStats);

// User Management
router.get("/users", getAdminUsers);
router.patch("/users/:id/toggle-status", toggleUserStatus);
router.patch("/users/:id/status", toggleUserStatus);
router.put("/users/:id/status", toggleUserStatus);
router.delete("/users/:id", deleteUser);

// Skill Management
router.get("/skills", getAdminSkills);
router.delete("/skills", removeSkill);
router.delete("/skills/:id", removeSkill);
router.post("/skills/remove", removeSkill);

// Platform Exchanges & Sessions Monitoring
router.get("/exchanges", getAdminExchanges);
router.get("/sessions", getAdminSessions);

// Administrative Activity History
router.get("/activities", getAdminActivities);

// Reports
router.get("/reports", getReports);
router.patch("/reports/:id/review", reviewReport);
router.patch("/reports/:id/resolve", resolveReport);
router.delete("/reports/:id", deleteReport);

module.exports = router;
