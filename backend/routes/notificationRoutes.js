const express = require("express");
const router = express.Router();

const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
} = require("../controllers/notificationController");

const { protect } = require("../middleware/authMiddleware");

// All notification endpoints require authentication
router.use(protect);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.put("/read-all", markAllAsRead);
router.patch("/read-all", markAllAsRead);
router.delete("/clear-all", clearAllNotifications);
router.put("/:id/read", markAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

module.exports = router;
