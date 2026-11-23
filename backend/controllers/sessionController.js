const Session = require("../models/Session");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Exchange = require("../models/Exchange");

// Check if authenticated user is the exclusive session creator
const checkSessionCreator = (session, userId) => {
    const creatorId = session.createdBy
        ? session.createdBy.toString()
        : (session.user ? (session.user._id ? session.user._id.toString() : session.user.toString()) : null);
    return Boolean(creatorId && creatorId === userId.toString());
};

// GET ALL SESSIONS FOR CURRENT USER
const getMySessions = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query;

        const filter = {
            $or: [{ user: userId }, { partner: userId }]
        };

        if (status && status !== "all") {
            filter.status = status;
        }

        const sessions = await Session.find(filter)
            .populate("user", "name fullName photo")
            .populate("partner", "name fullName photo")
            .sort({ date: 1, time: 1 });

        const formatted = sessions.map((s) => {
            const isUser = s.user && s.user._id ? s.user._id.toString() === userId.toString() : false;
            const counterpart = isUser ? s.partner : s.user;
            const creatorId = s.createdBy
                ? s.createdBy.toString()
                : (s.user ? (s.user._id ? s.user._id.toString() : s.user.toString()) : null);
            const isCreator = Boolean(creatorId && creatorId === userId.toString());

            return {
                ...s.toObject(),
                id: s._id,
                _id: s._id,
                partner: counterpart ? (counterpart.name || counterpart.fullName || "Partner") : "Partner",
                photo: counterpart ? (counterpart.photo || "https://randomuser.me/api/portraits/men/32.jpg") : "https://randomuser.me/api/portraits/men/32.jpg",
                createdBy: creatorId,
                isCreator
            };
        });

        res.status(200).json({
            success: true,
            count: formatted.length,
            sessions: formatted
        });

    } catch (error) {
        console.error("GetMySessions Error:", error);
        res.status(500).json({ success: false, message: "Error fetching sessions" });
    }
};

// SCHEDULE A NEW SESSION
const createSession = async (req, res) => {
    try {
        const {
            partnerId,
            partner, // can be partner name
            skill,
            date,
            time,
            mode = "Online Video",
            meetingLink,
            meetingLocation,
            duration = "1 Hour"
        } = req.body;

        if (!date || !time || !skill) {
            return res.status(400).json({ success: false, message: "Date, time, and skill are required" });
        }

        let targetPartner = null;
        if (partnerId) {
            targetPartner = await User.findById(partnerId);
        } else if (partner) {
            targetPartner = await User.findOne({ name: partner });
        }

        if (!targetPartner) {
            return res.status(404).json({ success: false, message: "Partner not found" });
        }

        // Target partner cannot be the authenticated user
        if (targetPartner._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: "You cannot schedule a session with yourself" });
        }

        // Disabled or inactive accounts cannot be scheduled with
        if (targetPartner.status !== "Active") {
            return res.status(400).json({ success: false, message: "Cannot schedule a session with an inactive or disabled user" });
        }

        // Prevent duplicate scheduling of the same session
        const existingSession = await Session.findOne({
            $or: [
                { user: req.user._id, partner: targetPartner._id, date, time },
                { user: targetPartner._id, partner: req.user._id, date, time }
            ],
            status: "upcoming"
        });

        if (existingSession) {
            return res.status(400).json({
                success: false,
                message: `An upcoming session is already scheduled at ${time} on ${date}.`
            });
        }

        // Verify exchange participant authorization and valid state if exchangeId is provided
        if (req.body.exchangeId) {
            const exchange = await Exchange.findById(req.body.exchangeId);
            if (!exchange) {
                return res.status(404).json({ success: false, message: "Associated exchange not found" });
            }

            if (exchange.status === "cancelled" || exchange.status === "rejected" || exchange.status === "completed") {
                return res.status(400).json({
                    success: false,
                    message: `Cannot schedule sessions for an exchange that is ${exchange.status}`
                });
            }

            const reqId = req.user._id.toString();
            const partnerIdStr = targetPartner._id.toString();
            const exRequesterId = exchange.requester.toString();
            const exPartnerId = exchange.partner.toString();

            const isAuthorizedPair =
                (exRequesterId === reqId && exPartnerId === partnerIdStr) ||
                (exPartnerId === reqId && exRequesterId === partnerIdStr);

            if (!isAuthorizedPair) {
                return res.status(403).json({
                    success: false,
                    message: "Both you and the partner must be the designated participants in this exchange"
                });
            }
        }

        const session = await Session.create({
            user: req.user._id,
            partner: targetPartner._id,
            createdBy: req.user._id,
            exchangeId: req.body.exchangeId || undefined,
            skill: skill.trim(),
            date,
            time,
            duration,
            mode,
            meetingLink: mode.toLowerCase().includes("online") ? (meetingLink || "https://meet.google.com/sb-learn-hub") : "",
            meetingLocation: mode.toLowerCase().includes("offline") || mode.toLowerCase().includes("in-person") ? (meetingLocation || "Public Library, Kerala") : "",
            status: "upcoming"
        });

        // Notify partner
        try {
            await Notification.create({
                recipient: targetPartner._id,
                sender: req.user._id,
                type: "session",
                title: "New Session Scheduled",
                text: `${req.user.name} scheduled a ${mode} session with you for ${skill} on ${date} at ${time}.`,
                link: `/sessions`
            });
        } catch (e) {
            console.error("Notif error:", e);
        }

        res.status(201).json({
            success: true,
            message: `Session scheduled: ${skill} with ${targetPartner.name} on ${date} at ${time}.`,
            session: {
                ...session.toObject(),
                id: session._id,
                _id: session._id,
                partner: targetPartner.name,
                photo: targetPartner.photo,
                createdBy: req.user._id,
                isCreator: true
            }
        });

    } catch (error) {
        console.error("CreateSession Error:", error);
        res.status(500).json({ success: false, message: "Error scheduling session: " + error.message });
    }
};

// EDIT / UPDATE SESSION
const updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await Session.findById(id);

        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        const isCreator = checkSessionCreator(session, req.user._id);
        if (!isCreator) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to modify this session. Only the session creator can manage it."
            });
        }

        const { date, time, duration, mode, meetingLink, meetingLocation, skill } = req.body;
        if (date) session.date = date;
        if (time) session.time = time;
        if (duration) session.duration = duration;
        if (mode) session.mode = mode;
        if (meetingLink !== undefined) session.meetingLink = meetingLink;
        if (meetingLocation !== undefined) session.meetingLocation = meetingLocation;
        if (skill && skill.trim()) session.skill = skill.trim();

        await session.save();

        res.status(200).json({
            success: true,
            message: "Session updated successfully",
            session: {
                ...session.toObject(),
                id: session._id,
                _id: session._id,
                isCreator: true
            }
        });
    } catch (error) {
        console.error("UpdateSession Error:", error);
        res.status(500).json({ success: false, message: "Error updating session" });
    }
};

// MARK SESSION COMPLETED
const completeSession = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await Session.findById(id);

        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        const isCreator = checkSessionCreator(session, req.user._id);
        if (!isCreator) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to modify this session. Only the session creator can manage it."
            });
        }

        session.status = "completed";
        await session.save();

        res.status(200).json({
            success: true,
            message: "Session marked as completed",
            session: {
                ...session.toObject(),
                id: session._id,
                _id: session._id,
                isCreator: true
            }
        });

    } catch (error) {
        console.error("CompleteSession Error:", error);
        res.status(500).json({ success: false, message: "Error updating session" });
    }
};

// CANCEL SESSION
const cancelSession = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await Session.findById(id);

        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found" });
        }

        const isCreator = checkSessionCreator(session, req.user._id);
        if (!isCreator) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to modify this session. Only the session creator can manage it."
            });
        }

        await Session.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Session cancelled and removed"
        });

    } catch (error) {
        console.error("CancelSession Error:", error);
        res.status(500).json({ success: false, message: "Error cancelling session" });
    }
};

module.exports = {
    getMySessions,
    createSession,
    updateSession,
    completeSession,
    cancelSession
};

