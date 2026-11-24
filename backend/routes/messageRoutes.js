const express = require("express");
const router = express.Router();

const {
    getConversations,
    getConversationById,
    startConversation,
    sendMessage,
    markAsRead,
    getUnreadCount
} = require("../controllers/messageController");

const { protect } = require("../middleware/authMiddleware");

// All messaging endpoints require authentication
router.use(protect);

router.get("/conversations", getConversations);
router.post("/conversations", startConversation);
router.get("/conversations/:id", getConversationById);
router.post("/conversations/:id/messages", sendMessage);
router.put("/conversations/:id/read", markAsRead);
router.patch("/conversations/:id/read", markAsRead);
router.get("/unread-count", getUnreadCount);

module.exports = router;
