const Notification = require("../models/Notification");

// GET ALL NOTIFICATIONS FOR CURRENT USER
const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const notifications = await Notification.find({ recipient: userId })
            .sort({ createdAt: -1 })
            .limit(50);

        const formatted = notifications.map((n) => {
            const timeAgo = formatTimeAgo(n.createdAt);
            return {
                ...n.toObject(),
                id: n._id,
                time: timeAgo
            };
        });

        const unreadCount = notifications.filter((n) => !n.read).length;

        res.status(200).json({
            success: true,
            unreadCount,
            notifications: formatted
        });

    } catch (error) {
        console.error("GetNotifications Error:", error);
        res.status(500).json({ success: false, message: "Error fetching notifications" });
    }
};

// MARK NOTIFICATION AS READ
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOne({
            _id: id,
            recipient: req.user._id
        });

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        notification.read = true;
        await notification.save();

        res.status(200).json({
            success: true,
            message: "Notification marked as read",
            notification: { ...notification.toObject(), id: notification._id }
        });

    } catch (error) {
        console.error("MarkAsRead Error:", error);
        res.status(500).json({ success: false, message: "Error updating notification" });
    }
};

// MARK ALL AS READ
const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, read: false },
            { $set: { read: true } }
        );

        res.status(200).json({
            success: true,
            message: "All notifications marked as read"
        });

    } catch (error) {
        console.error("MarkAllAsRead Error:", error);
        res.status(500).json({ success: false, message: "Error updating notifications" });
    }
};

// DELETE NOTIFICATION
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findOneAndDelete({
            _id: id,
            recipient: req.user._id
        });

        res.status(200).json({
            success: true,
            message: "Notification removed"
        });

    } catch (error) {
        console.error("DeleteNotification Error:", error);
        res.status(500).json({ success: false, message: "Error deleting notification" });
    }
};

// Helper for relative time strings
function formatTimeAgo(date) {
    if (!date) return "Just now";
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(date).toLocaleDateString([], { month: "short", day: "numeric" });
}

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
};

