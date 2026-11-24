const mongoose = require("mongoose");
const Notification = require("../models/Notification");

// Helper for relative time formatting
const formatTimeAgo = (date) => {
    if (!date) return "Just now";
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(date).toLocaleDateString([], { month: "short", day: "numeric" });
};

// GET ALL NOTIFICATIONS FOR CURRENT AUTHENTICATED USER
const getNotifications = async (req, res) => {
    try {
        const userId = req.user._id;
        const { type, read } = req.query;

        const filter = { recipient: userId };

        if (read === "false" || read === false) {
            filter.read = false;
        } else if (read === "true" || read === true) {
            filter.read = true;
        }

        if (type && type !== "all") {
            if (type === "requests") {
                filter.type = { $in: ["request", "accepted", "rejected", "cancelled"] };
            } else if (type === "messages") {
                filter.type = "message";
            } else if (type === "sessions") {
                filter.type = { $in: ["session", "completed"] };
            } else {
                filter.type = type;
            }
        }

        const notifications = await Notification.find(filter)
            .populate("sender", "-password -resetPasswordToken -resetPasswordExpire")
            .sort({ createdAt: -1 })
            .limit(100);

        const formatted = notifications.map((n) => {
            const nObj = n.toObject ? n.toObject() : { ...n };
            const senderObj = nObj.sender && typeof nObj.sender === "object" ? nObj.sender : null;

            return {
                ...nObj,
                id: nObj._id,
                _id: nObj._id,
                time: formatTimeAgo(nObj.createdAt),
                senderName: senderObj ? (senderObj.name || senderObj.fullName) : null,
                senderPhoto: senderObj ? (senderObj.photo || senderObj.avatar) : null
            };
        });

        const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });

        res.status(200).json({
            success: true,
            count: formatted.length,
            unreadCount,
            notifications: formatted
        });

    } catch (error) {
        console.error("GetNotifications Error:", error);
        res.status(500).json({ success: false, message: "Error fetching notifications: " + error.message });
    }
};

// GET UNREAD COUNT FOR CURRENT USER
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user._id;
        const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });

        res.status(200).json({
            success: true,
            unreadCount
        });
    } catch (error) {
        console.error("GetUnreadCount Error:", error);
        res.status(500).json({ success: false, message: "Error fetching unread count: " + error.message });
    }
};

// MARK SINGLE NOTIFICATION AS READ
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid notification ID format." });
        }

        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }

        if (notification.recipient.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to modify this notification."
            });
        }

        notification.read = true;
        await notification.save();

        const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });

        res.status(200).json({
            success: true,
            message: "Notification marked as read.",
            notification: {
                ...notification.toObject(),
                id: notification._id,
                time: formatTimeAgo(notification.createdAt)
            },
            unreadCount
        });

    } catch (error) {
        console.error("MarkAsRead Error:", error);
        res.status(500).json({ success: false, message: "Error updating notification: " + error.message });
    }
};

// MARK ALL NOTIFICATIONS AS READ
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { recipient: userId, read: false },
            { $set: { read: true } }
        );

        res.status(200).json({
            success: true,
            message: "All notifications marked as read.",
            unreadCount: 0
        });

    } catch (error) {
        console.error("MarkAllAsRead Error:", error);
        res.status(500).json({ success: false, message: "Error updating notifications: " + error.message });
    }
};

// DELETE SINGLE NOTIFICATION
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid notification ID format." });
        }

        const notification = await Notification.findById(id);

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }

        if (notification.recipient.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this notification."
            });
        }

        await Notification.findByIdAndDelete(id);

        const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });

        res.status(200).json({
            success: true,
            message: "Notification removed successfully.",
            unreadCount
        });

    } catch (error) {
        console.error("DeleteNotification Error:", error);
        res.status(500).json({ success: false, message: "Error deleting notification: " + error.message });
    }
};

// BULK CLEAR ALL NOTIFICATIONS FOR USER
const clearAllNotifications = async (req, res) => {
    try {
        const userId = req.user._id;

        await Notification.deleteMany({ recipient: userId });

        res.status(200).json({
            success: true,
            message: "All notifications cleared.",
            unreadCount: 0
        });

    } catch (error) {
        console.error("ClearAllNotifications Error:", error);
        res.status(500).json({ success: false, message: "Error clearing notifications: " + error.message });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications
};
