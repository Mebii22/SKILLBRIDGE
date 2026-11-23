const express = require("express");
const router = express.Router();

const {
    createExchange,
    getMyExchanges,
    getExchangeById,
    acceptExchange,
    rejectExchange,
    cancelExchange,
    completeSession,
    submitReview
} = require("../controllers/exchangeController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getMyExchanges);
router.get("/my", protect, getMyExchanges);
router.post("/", protect, createExchange);
router.get("/:id", protect, getExchangeById);
router.put("/:id/accept", protect, acceptExchange);
router.patch("/:id/accept", protect, acceptExchange);
router.put("/:id/reject", protect, rejectExchange);
router.patch("/:id/reject", protect, rejectExchange);
router.put("/:id/cancel", protect, cancelExchange);
router.patch("/:id/cancel", protect, cancelExchange);
router.put("/:id/complete-session", protect, completeSession);
router.patch("/:id/complete-session", protect, completeSession);
router.post("/:id/review", protect, submitReview);

module.exports = router;

