const express = require("express");
const router = express.Router();

const {
    getMySessions,
    createSession,
    updateSession,
    completeSession,
    cancelSession
} = require("../controllers/sessionController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getMySessions);
router.post("/", protect, createSession);
router.put("/:id", protect, updateSession);
router.put("/:id/complete", protect, completeSession);
router.patch("/:id/complete", protect, completeSession);
router.delete("/:id", protect, cancelSession);

module.exports = router;

