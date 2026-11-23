const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Notification = require("../models/Notification");

// Format a conversation for the requesting user
const formatConversation = (c, currentUserId) => {
    const counterpart = c.participants.find((p) => p._id.toString() !== currentUserId.toString()) || c.participants[0];

    const formattedMessages = (c.messages || []).map((m) => {
        const isMe = m.sender.toString() === currentUserId.toString();
        const msgTime = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return {
            id: m._id,
            from: isMe ? "me" : "them",
            text: m.text,
            time: msgTime,
            read: m.read,
            createdAt: m.createdAt
        };
    });

    const unreadCount = (c.messages || []).filter(
        (m) => m.sender.toString() !== currentUserId.toString() && !m.read
    ).length;

    const lastTime = c.lastMessageAt
        ? new Date(c.lastMessageAt).toLocaleDateString([], { month: "short", day: "numeric" })
        : "Just now";

    return {
        id: c._id,
        _id: c._id,
        userId: counterpart ? counterpart._id : null,
        name: counterpart ? counterpart.name || counterpart.fullName : "Partner",
        photo: counterpart ? counterpart.photo || "https://randomuser.me/api/portraits/men/32.jpg" : "",
        time: lastTime,
        lastMessage: c.lastMessage,
        unreadCount,
        messages: formattedMessages
    };
};

// GET ALL CONVERSATIONS
const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        const conversations = await Conversation.find({
            participants: userId
        })
            .populate("participants", "name fullName photo")
            .sort({ lastMessageAt: -1 });

        const formatted = conversations.map((c) => formatConversation(c, userId));

        res.status(200).json({
            success: true,
            count: formatted.length,
            conversations: formatted
        });

    } catch (error) {
        console.error("GetConversations Error:", error);
        res.status(500).json({ success: false, message: "Error fetching conversations" });
    }
};

// START OR RETRIEVE CONVERSATION
const startConversation = async (req, res) => {
    try {
        const { partnerId, partnerName, initialMessage } = req.body;
        const currentUserId = req.user._id;

        let targetUserId = partnerId;
        if (!targetUserId && partnerName) {
            const partnerUser = await User.findOne({ name: partnerName });
            if (partnerUser) targetUserId = partnerUser._id;
        }

        if (!targetUserId) {
            return res.status(400).json({ success: false, message: "Valid partner ID is required" });
        }

        if (targetUserId.toString() === currentUserId.toString()) {
            return res.status(400).json({ success: false, message: "You cannot chat with yourself." });
        }

        // Check for existing conversation between these two
        let conversation = await Conversation.findOne({
            participants: { $all: [currentUserId, targetUserId] }
        }).populate("participants", "name fullName photo");

        if (!conversation) {
            const initialMsgs = [];
            if (initialMessage && initialMessage.trim()) {
                initialMsgs.push({
                    sender: currentUserId,
                    text: initialMessage.trim(),
                    read: false
                });
            }

            conversation = await Conversation.create({
                participants: [currentUserId, targetUserId],
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
                        text: `${req.user.name}: “${initialMessage.trim().substring(0, 60)}”`,
                        link: "/messages"
                    });
                } catch (e) {
                    console.error("Notif error:", e);
                }
            }

            conversation = await Conversation.findById(conversation._id).populate("participants", "name fullName photo");
        }

        res.status(200).json({
            success: true,
            conversation: formatConversation(conversation, currentUserId)
        });

    } catch (error) {
        console.error("StartConversation Error:", error);
        res.status(500).json({ success: false, message: "Error starting conversation" });
    }
};

// SEND A MESSAGE
const sendMessage = async (req, res) => {
    try {
        const { id } = req.params; // conversationId
        const { text } = req.body;
        const currentUserId = req.user._id;

        if (!text || !text.trim()) {
            return res.status(400).json({ success: false, message: "Message text cannot be empty" });
        }

        const conversation = await Conversation.findById(id).populate("participants", "name fullName photo");
        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        const isParticipant = conversation.participants.some(
            (p) => p._id.toString() === currentUserId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: "Not authorized to send messages in this chat" });
        }

        const newMsg = {
            sender: currentUserId,
            text: text.trim(),
            read: false
        };

        conversation.messages.push(newMsg);
        conversation.lastMessage = text.trim();
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Counterpart notification
        const counterpart = conversation.participants.find((p) => p._id.toString() !== currentUserId.toString());
        if (counterpart) {
            try {
                await Notification.create({
                    recipient: counterpart._id,
                    sender: currentUserId,
                    type: "message",
                    title: "New Message",
                    text: `${req.user.name}: “${text.trim().substring(0, 60)}”`,
                    link: "/messages"
                });
            } catch (e) {
                console.error("Notif error:", e);
            }
        }

        res.status(201).json({
            success: true,
            message: "Message sent",
            conversation: formatConversation(conversation, currentUserId)
        });

    } catch (error) {
        console.error("SendMessage Error:", error);
        res.status(500).json({ success: false, message: "Error sending message" });
    }
};

// MARK CONVERSATION AS READ
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUserId = req.user._id;

        const conversation = await Conversation.findById(id);
        if (!conversation) {
            return res.status(404).json({ success: false, message: "Conversation not found" });
        }

        let updated = false;
        conversation.messages.forEach((m) => {
            if (m.sender.toString() !== currentUserId.toString() && !m.read) {
                m.read = true;
                updated = true;
            }
        });

        if (updated) {
            await conversation.save();
        }

        res.status(200).json({
            success: true,
            message: "Conversation marked as read"
        });

    } catch (error) {
        console.error("MarkAsRead Error:", error);
        res.status(500).json({ success: false, message: "Error updating read status" });
    }
};

module.exports = {
    getConversations,
    startConversation,
    sendMessage,
    markAsRead
};

