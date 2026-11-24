const express = require("express");
const router = express.Router();

const {
    getMySessions,
    getSessionById,
    createSession,
    updateSession,
    completeSession,
    cancelSession
} = require("../controllers/sessionController");

const { protect } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

router.get("/", getMySessions);
router.post("/", createSession);
router.get("/:id", getSessionById);
router.put("/:id", updateSession);
router.patch("/:id", updateSession);
router.put("/:id/complete", completeSession);
router.patch("/:id/complete", completeSession);
router.put("/:id/cancel", cancelSession);
router.patch("/:id/cancel", cancelSession);
router.delete("/:id", cancelSession);

module.exports = router;
