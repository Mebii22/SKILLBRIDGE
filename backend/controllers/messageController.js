const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Exchange = require("../models/Exchange");

// Format a conversation for the requesting user
const formatConversation = (c, currentUserId) => {
    const cObj = c.toObject ? c.toObject() : { ...c };
    const currentIdStr = currentUserId ? currentUserId.toString() : "";

    const participants = cObj.participants || [];
    const counterpart = participants.find((p) => {
        const pId = p._id ? p._id.toString() : p.toString();
        return pId !== currentIdStr;
    }) || participants[0];

    const counterpartId = counterpart?._id ? counterpart._id.toString() : (counterpart ? counterpart.toString() : null);
    const counterpartName = counterpart?.name || counterpart?.fullName || "Learning Partner";
    const counterpartPhoto = counterpart?.photo || counterpart?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

    const formattedMessages = (cObj.messages || []).map((m) => {
        const senderIdStr = m.sender?._id ? m.sender._id.toString() : m.sender.toString();
        const isMe = senderIdStr === currentIdStr;
        const msgDate = m.createdAt ? new Date(m.createdAt) : new Date();
        const msgTime = msgDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        return {
            id: m._id,
            _id: m._id,
            senderId: senderIdStr,
            from: isMe ? "me" : "them",
            text: m.text,
            time: msgTime,
            read: Boolean(m.read),
            readAt: m.readAt || null,
            createdAt: m.createdAt
        };
    });

    const unreadCount = (cObj.messages || []).filter((m) => {
        const senderIdStr = m.sender?._id ? m.sender._id.toString() : m.sender.toString();
        return senderIdStr !== currentIdStr && !m.read;
    }).length;

    const lastTime = cObj.lastMessageAt
        ? new Date(cObj.lastMessageAt).toLocaleDateString([], { month: "short", day: "numeric" })
        : "Just now";

    return {
        id: cObj._id,
        _id: cObj._id,
        userId: counterpartId,
        partnerId: counterpartId,
        name: counterpartName,
        partnerName: counterpartName,
        photo: counterpartPhoto,
        partnerPhoto: counterpartPhoto,
        counterpart: counterpart ? {
            id: counterpartId,
            name: counterpartName,
            photo: counterpartPhoto,
            email: counterpart.email || "",
            role: counterpart.role || "user",
            status: counterpart.status || "Active"
        } : null,
        time: lastTime,
        lastMessage: cObj.lastMessage || "",
        lastMessageAt: cObj.lastMessageAt,
        unreadCount,
        exchangeId: cObj.exchangeId || null,
        messages: formattedMessages
    };
};

// GET ALL CONVERSATIONS FOR CURRENT USER
const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        // Admin cannot participate in normal member chat
        if (req.user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrators cannot access member peer-to-peer conversations."
            });
        }

        if (req.user.status === "Disabled") {
            return res.status(403).json({
                success: false,
                message: "Disabled accounts cannot access conversations."
            });
        }

        const conversations = await Conversation.find({
            participants: userId
        })
            .populate("participants", "-password -resetPasswordToken -resetPasswordExpire")
            .populate("exchangeId", "teach want mode status progress")
            .sort({ lastMessageAt: -1 });

        const formatted = conversations.map((c) => formatConversation(c, userId));

        res.status(200).json({
            success: true,
            count: formatted.length,
            conversations: formatted
        });

    } catch (error) {
        console.error("GetConversations Error:", error);
        res.status(500).json({ success: false, message: "Error fetching conversations: " + error.message });
    }
};

// GET SINGLE CONVERSATION BY ID (WITH SCOPED PARTICIPANT AUTHORIZATION)
const getConversationById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid conversation ID format." });
        }

        if (req.user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrators cannot access member peer-to-peer conversations."
            });
        }

        if (req.user.status === "Disabled") {
            return res.status(403).json({
                success: false,
                message: "Disabled accounts cannot access conversations."
            });
        }

        const conversation = await Conversation.findById(id)
            .populate("participants", "-password -resetPasswordToken -resetPasswordExpire")
            .populate("exchangeId", "teach want mode status progress");

        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        const isParticipant = conversation.participants.some(
            (p) => (p._id ? p._id.toString() : p.toString()) === userId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view this conversation."
            });
        }

        res.status(200).json({
            success: true,
            conversation: formatConversation(conversation, userId)
        });

    } catch (error) {
        console.error("GetConversationById Error:", error);
        res.status(500).json({ success: false, message: "Error retrieving conversation: " + error.message });
    }
};

// START OR RETRIEVE CONVERSATION
const startConversation = async (req, res) => {
    try {
        const { partnerId, partnerName, initialMessage, exchangeId } = req.body;
        const currentUserId = req.user._id;

        if (req.user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrators cannot initiate member peer-to-peer conversations."
            });
        }

        if (req.user.status === "Disabled") {
            return res.status(403).json({
                success: false,
                message: "Disabled accounts cannot initiate conversations."
            });
        }

        let targetUserId = null;
        let associatedExchange = null;

        // 1. If exchangeId provided, validate exchange relationship
        if (exchangeId) {
            if (!mongoose.Types.ObjectId.isValid(exchangeId)) {
                return res.status(400).json({ success: false, message: "Invalid exchange ID format." });
            }

            associatedExchange = await Exchange.findById(exchangeId);
            if (!associatedExchange) {
                return res.status(404).json({ success: false, message: "Associated exchange not found." });
            }

            const isExchangeParticipant =
                associatedExchange.requester.toString() === currentUserId.toString() ||
                associatedExchange.partner.toString() === currentUserId.toString();

            if (!isExchangeParticipant) {
                return res.status(403).json({
                    success: false,
                    message: "You are not an authorized participant in this exchange."
                });
            }

            targetUserId = associatedExchange.requester.toString() === currentUserId.toString()
                ? associatedExchange.partner
                : associatedExchange.requester;
        } else {
            // Direct conversation initiation
            if (partnerId) {
                if (!mongoose.Types.ObjectId.isValid(partnerId)) {
                    return res.status(400).json({ success: false, message: "Invalid partner ID format." });
                }
                const foundUser = await User.findById(partnerId);
                if (foundUser) targetUserId = foundUser._id;
            } else if (partnerName) {
                const foundUser = await User.findOne({
                    $or: [{ name: partnerName }, { fullName: partnerName }]
                });
                if (foundUser) targetUserId = foundUser._id;
            }
        }

        if (!targetUserId) {
            return res.status(404).json({ success: false, message: "Partner user not found." });
        }

        // Prevent chatting with oneself
        if (targetUserId.toString() === currentUserId.toString()) {
            return res.status(400).json({ success: false, message: "You cannot start a conversation with yourself." });
        }

        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "Partner user not found." });
        }

        if (targetUser.role === "admin") {
            return res.status(400).json({ success: false, message: "Cannot message administrator accounts." });
        }

        if (targetUser.status === "Disabled") {
            return res.status(400).json({
                success: false,
                message: "Cannot start a conversation with an inactive or disabled user."
            });
        }

        // Check for existing conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [currentUserId, targetUserId] }
        }).populate("participants", "-password -resetPasswordToken -resetPasswordExpire");

        if (!conversation) {
            const initialMsgs = [];
            if (initialMessage && initialMessage.trim()) {
                if (initialMessage.trim().length > 2000) {
                    return res.status(400).json({
                        success: false,
                        message: "Message exceeds maximum allowed length of 2000 characters."
                    });
                }
                initialMsgs.push({
                    sender: currentUserId,
                    text: initialMessage.trim(),
                    read: false,
                    createdAt: new Date()
                });
            }

            conversation = await Conversation.create({
                participants: [currentUserId, targetUserId],
                exchangeId: associatedExchange ? associatedExchange._id : undefined,
                messages: initialMsgs,
                lastMessage: initialMsgs[0]?.text || "Conversation started",
                lastMessageAt: new Date()
            });

            if (initialMsgs.length > 0) {
                try {
                    await Notification.create({
                        recipient: targetUserId,
                        sender: currentUserId,
                        type: "message",
                        title: "New Message",
                        text: `${req.user.name || "A partner"}: “${initialMessage.trim().substring(0, 60)}”`,
                        link: "/messages"
                    });
                } catch (e) {
                    console.error("Notif error on initial message:", e);
                }
            }

            conversation = await Conversation.findById(conversation._id)
                .populate("participants", "-password -resetPasswordToken -resetPasswordExpire")
                .populate("exchangeId", "teach want mode status progress");
        } else {
            // If exchangeId provided and not yet linked, link it
            if (associatedExchange && !conversation.exchangeId) {
                conversation.exchangeId = associatedExchange._id;
                await conversation.save();
            }

            // If initialMessage provided on existing conversation, append it
            if (initialMessage && initialMessage.trim()) {
                if (initialMessage.trim().length > 2000) {
                    return res.status(400).json({
                        success: false,
                        message: "Message exceeds maximum allowed length of 2000 characters."
                    });
                }
                conversation.messages.push({
                    sender: currentUserId,
                    text: initialMessage.trim(),
                    read: false,
                    createdAt: new Date()
                });
                conversation.lastMessage = initialMessage.trim();
                conversation.lastMessageAt = new Date();
                await conversation.save();

                try {
                    await Notification.create({
                        recipient: targetUserId,
                        sender: currentUserId,
                        type: "message",
                        title: "New Message",
                        text: `${req.user.name || "A partner"}: “${initialMessage.trim().substring(0, 60)}”`,
                        link: "/messages"
                    });
                } catch (e) {
                    console.error("Notif error on append message:", e);
                }
            }
        }

        res.status(200).json({
            success: true,
            conversation: formatConversation(conversation, currentUserId)
        });

    } catch (error) {
        console.error("StartConversation Error:", error);
        res.status(500).json({ success: false, message: "Error starting conversation: " + error.message });
    }
};

// SEND A MESSAGE IN A CONVERSATION
const sendMessage = async (req, res) => {
    try {
        const { id } = req.params; // conversationId
        const { text } = req.body;
        const currentUserId = req.user._id;

        if (req.user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrators cannot send messages in member peer-to-peer conversations."
            });
        }

        if (req.user.status === "Disabled") {
            return res.status(403).json({
                success: false,
                message: "Disabled accounts cannot send messages."
            });
        }

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid conversation ID format." });
        }

        // Validate text
        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, message: "Message text cannot be empty." });
        }

        if (text.trim().length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Message exceeds maximum allowed length of 2000 characters."
            });
        }

        const conversation = await Conversation.findById(id)
            .populate("participants", "-password -resetPasswordToken -resetPasswordExpire");

        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        const isParticipant = conversation.participants.some(
            (p) => (p._id ? p._id.toString() : p.toString()) === currentUserId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to send messages in this conversation."
            });
        }

        // Create message — sender is ALWAYS current authenticated user req.user._id
        const newMsg = {
            sender: currentUserId,
            text: text.trim(),
            read: false,
            createdAt: new Date()
        };

        conversation.messages.push(newMsg);
        conversation.lastMessage = text.trim();
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Notify counterpart
        const counterpart = conversation.participants.find(
            (p) => (p._id ? p._id.toString() : p.toString()) !== currentUserId.toString()
        );

        if (counterpart) {
            try {
                await Notification.create({
                    recipient: counterpart._id || counterpart,
                    sender: currentUserId,
                    type: "message",
                    title: "New Message",
                    text: `${req.user.name || "A partner"}: “${text.trim().substring(0, 60)}”`,
                    link: "/messages"
                });
            } catch (e) {
                console.error("Message notification error:", e);
            }
        }

        res.status(201).json({
            success: true,
            message: "Message sent successfully.",
            conversation: formatConversation(conversation, currentUserId)
        });

    } catch (error) {
        console.error("SendMessage Error:", error);
        res.status(500).json({ success: false, message: "Error sending message: " + error.message });
    }
};

// MARK CONVERSATION AS READ
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user._id;

        if (req.user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrators cannot access member conversations."
            });
        }

        if (req.user.status === "Disabled") {
            return res.status(403).json({
                success: false,
                message: "Disabled accounts cannot modify conversations."
            });
        }

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid conversation ID format." });
        }

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found." });
        }

        const isParticipant = conversation.participants.some(
            (p) => (p._id ? p._id.toString() : p.toString()) === currentUserId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to modify messages in this conversation."
            });
        }

        let updated = false;
        conversation.messages.forEach((m) => {
            const senderIdStr = m.sender?._id ? m.sender._id.toString() : m.sender.toString();
            if (senderIdStr !== currentUserId.toString() && !m.read) {
                m.read = true;
                m.readAt = new Date();
                updated = true;
            }
        });

        if (updated) {
            await conversation.save();
        }

        res.status(200).json({
            success: true,
            message: "Conversation marked as read."
        });

    } catch (error) {
        console.error("MarkAsRead Error:", error);
        res.status(500).json({ success: false, message: "Error updating read status: " + error.message });
    }
};

// GET TOTAL UNREAD COUNT ACROSS ALL USER'S CONVERSATIONS
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user._id;

        if (req.user.role === "admin" || req.user.status === "Disabled") {
            return res.status(200).json({ success: true, unreadCount: 0 });
        }

        const conversations = await Conversation.find({ participants: userId });
        let totalUnread = 0;

        conversations.forEach((c) => {
            (c.messages || []).forEach((m) => {
                const senderIdStr = m.sender?._id ? m.sender._id.toString() : m.sender.toString();
                if (senderIdStr !== userId.toString() && !m.read) {
                    totalUnread++;
                }
            });
        });

        res.status(200).json({
            success: true,
            unreadCount: totalUnread
        });

    } catch (error) {
        console.error("GetUnreadCount Error:", error);
        res.status(500).json({ success: false, message: "Error calculating unread count: " + error.message });
    }
};

module.exports = {
    getConversations,
    getConversationById,
    startConversation,
    sendMessage,
    markAsRead,
    getUnreadCount
};
