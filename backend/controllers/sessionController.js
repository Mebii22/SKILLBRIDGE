const mongoose = require("mongoose");
const Session = require("../models/Session");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Exchange = require("../models/Exchange");

// Check if user is an authorized participant in the session
const checkParticipant = (session, userId) => {
    if (!session || !userId) return false;
    const uid = userId.toString();
    const u = session.user?._id ? session.user._id.toString() : session.user?.toString();
    const p = session.partner?._id ? session.partner._id.toString() : session.partner?.toString();
    const c = session.createdBy?._id ? session.createdBy._id.toString() : session.createdBy?.toString();
    return u === uid || p === uid || c === uid;
};

// Format session for calling user without exposing sensitive fields
const formatSessionForUser = (session, currentUserId) => {
    const sObj = session.toObject ? session.toObject() : { ...session };
    const currentIdStr = currentUserId ? currentUserId.toString() : "";

    const userObj = sObj.user && typeof sObj.user === "object" ? sObj.user : null;
    const partnerObj = sObj.partner && typeof sObj.partner === "object" ? sObj.partner : null;

    const userIdStr = userObj?._id ? userObj._id.toString() : (sObj.user ? sObj.user.toString() : "");
    const partnerIdStr = partnerObj?._id ? partnerObj._id.toString() : (sObj.partner ? sObj.partner.toString() : "");

    const isUserCaller = userIdStr === currentIdStr;
    const counterpartObj = isUserCaller ? partnerObj : userObj;
    const counterpartId = isUserCaller ? partnerIdStr : userIdStr;

    const creatorId = sObj.createdBy
        ? (sObj.createdBy._id ? sObj.createdBy._id.toString() : sObj.createdBy.toString())
        : userIdStr;
    const isCreator = Boolean(creatorId && creatorId === currentIdStr);

    const partnerName = counterpartObj
        ? (counterpartObj.name || counterpartObj.fullName || "Partner")
        : (sObj.partnerName || "Partner");

    const partnerPhoto = counterpartObj?.photo || counterpartObj?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

    return {
        ...sObj,
        id: sObj._id,
        _id: sObj._id,
        partner: partnerName,
        partnerName,
        photo: partnerPhoto,
        partnerPhoto,
        counterpartId,
        counterpart: counterpartObj ? {
            id: counterpartObj._id || counterpartId,
            name: partnerName,
            photo: partnerPhoto,
            email: counterpartObj.email || "",
            role: counterpartObj.role || "user"
        } : null,
        isCreator,
        canManage: checkParticipant(sObj, currentUserId)
    };
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

        const sortOrder = (status === "completed" || status === "cancelled")
            ? { date: -1, time: -1 }
            : { date: 1, time: 1 };

        const sessions = await Session.find(filter)
            .populate("user", "name fullName photo avatar email role status")
            .populate("partner", "name fullName photo avatar email role status")
            .populate("exchangeId", "teach want mode status progress totalSessions completedSessions")
            .sort(sortOrder);

        const formatted = sessions.map((s) => formatSessionForUser(s, userId));

        res.status(200).json({
            success: true,
            count: formatted.length,
            sessions: formatted
        });

    } catch (error) {
        console.error("GetMySessions Error:", error);
        res.status(500).json({ success: false, message: "Error fetching sessions." });
    }
};

// GET SINGLE SESSION BY ID
const getSessionById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid session ID format." });
        }

        const session = await Session.findById(id)
            .populate("user", "name fullName photo avatar email role status")
            .populate("partner", "name fullName photo avatar email role status")
            .populate("exchangeId", "teach want mode status progress totalSessions completedSessions");

        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found." });
        }

        const isAuthorized = checkParticipant(session, req.user._id) || req.user.role === "admin";
        if (!isAuthorized) {
            return res.status(403).json({ success: false, message: "You are not authorized to view this session." });
        }

        res.status(200).json({
            success: true,
            session: formatSessionForUser(session, req.user._id)
        });
    } catch (error) {
        console.error("GetSessionById Error:", error);
        res.status(500).json({ success: false, message: "Error retrieving session." });
    }
};

// SCHEDULE A NEW SESSION
const createSession = async (req, res) => {
    try {
        const {
            exchangeId,
            partnerId,
            partner,
            skill,
            title,
            topic,
            sessionNum,
            date,
            time,
            mode = "Online Video",
            meetingLink,
            meetingLocation,
            duration = "1 Hour",
            description,
            notes
        } = req.body;

        // 1. Validate required basic fields
        if (!date || !time || !skill || !skill.trim()) {
            return res.status(400).json({ success: false, message: "Date, time, and skill are required." });
        }

        // 2. Validate date format and prevent past scheduling
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ success: false, message: "Invalid date format." });
        }

        const todayStr = new Date().toISOString().split("T")[0];
        // Compare date strings YYYY-MM-DD
        const sessionDateStr = parsedDate.toISOString().split("T")[0];
        if (sessionDateStr < todayStr) {
            return res.status(400).json({ success: false, message: "Session date cannot be in the past." });
        }

        // 3. Validate mode-specific link / location requirements
        const isOnlineMode = mode.toLowerCase().includes("online");
        const isOfflineMode = mode.toLowerCase().includes("offline") || mode.toLowerCase().includes("in-person");

        if (isOnlineMode && (!meetingLink || !meetingLink.trim())) {
            return res.status(400).json({ success: false, message: "A valid meeting link is required for online sessions." });
        }

        if (isOfflineMode && (!meetingLocation || !meetingLocation.trim())) {
            return res.status(400).json({ success: false, message: "A meeting location is required for offline sessions." });
        }

        let targetPartnerId = null;
        let associatedExchange = null;

        // 4. Handle exchange association if exchangeId provided
        if (exchangeId) {
            if (!mongoose.Types.ObjectId.isValid(exchangeId)) {
                return res.status(400).json({ success: false, message: "Invalid exchange ID format." });
            }

            associatedExchange = await Exchange.findById(exchangeId);
            if (!associatedExchange) {
                return res.status(404).json({ success: false, message: "Associated exchange not found." });
            }

            // Exchange status checks: must be active or accepted
            if (associatedExchange.status === "pending") {
                return res.status(400).json({
                    success: false,
                    message: "Cannot schedule sessions for a pending exchange. Exchange proposal must be accepted first."
                });
            }

            if (["cancelled", "rejected", "completed"].includes(associatedExchange.status)) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot schedule sessions for an exchange that is ${associatedExchange.status}.`
                });
            }

            const currentUserIdStr = req.user._id.toString();
            const exReqId = associatedExchange.requester.toString();
            const exPartId = associatedExchange.partner.toString();

            const isAuthorizedUser = exReqId === currentUserIdStr || exPartId === currentUserIdStr;
            if (!isAuthorizedUser) {
                return res.status(403).json({
                    success: false,
                    message: "You are not an authorized participant in this exchange."
                });
            }

            targetPartnerId = exReqId === currentUserIdStr ? associatedExchange.partner : associatedExchange.requester;

            // If partnerId was explicitly sent, verify it matches
            if (partnerId && partnerId.toString() !== targetPartnerId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: "Partner does not match designated exchange participant."
                });
            }
        } else {
            // Independent session: derive partner from partnerId or partner name
            if (partnerId) {
                if (!mongoose.Types.ObjectId.isValid(partnerId)) {
                    return res.status(400).json({ success: false, message: "Invalid partner ID format." });
                }
                const found = await User.findById(partnerId);
                if (found) targetPartnerId = found._id;
            } else if (partner) {
                const found = await User.findOne({
                    $or: [{ name: partner }, { fullName: partner }, { email: partner }]
                });
                if (found) targetPartnerId = found._id;
            }

            if (!targetPartnerId) {
                return res.status(404).json({ success: false, message: "Partner user not found." });
            }
        }

        // 5. Prevent scheduling with oneself
        if (targetPartnerId.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: "You cannot schedule a session with yourself." });
        }

        // 6. Check partner active state
        const targetPartner = await User.findById(targetPartnerId);
        if (!targetPartner || targetPartner.status !== "Active") {
            return res.status(400).json({
                success: false,
                message: "Cannot schedule a session with an inactive or disabled user."
            });
        }

        // 7. Prevent duplicate scheduling at exact same date & time for same participants
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

        // 8. Determine session number
        let calculatedSessionNum = Number(sessionNum) || 1;
        if (associatedExchange && !sessionNum) {
            const count = await Session.countDocuments({ exchangeId: associatedExchange._id });
            calculatedSessionNum = count + 1;
        }

        // 9. Create the Session
        const session = await Session.create({
            user: req.user._id,
            partner: targetPartner._id,
            createdBy: req.user._id,
            exchangeId: associatedExchange ? associatedExchange._id : undefined,
            title: title ? title.trim() : `${skill.trim()} Session #${calculatedSessionNum}`,
            topic: topic ? topic.trim() : "",
            sessionNum: calculatedSessionNum,
            skill: skill.trim(),
            date,
            time,
            duration,
            mode,
            meetingLink: isOnlineMode ? meetingLink.trim() : "",
            meetingLocation: isOfflineMode ? meetingLocation.trim() : "",
            description: description ? description.trim() : "",
            notes: notes ? notes.trim() : "",
            status: "upcoming"
        });

        // 10. Update associated exchange milestones if applicable
        if (associatedExchange) {
            if (!Array.isArray(associatedExchange.sessions)) {
                associatedExchange.sessions = [];
            }
            const exists = associatedExchange.sessions.find((s) => s.sessionNum === calculatedSessionNum);
            if (!exists) {
                associatedExchange.sessions.push({
                    sessionNum: calculatedSessionNum,
                    title: session.title,
                    date: session.date,
                    time: session.time,
                    duration: session.duration,
                    topic: session.topic,
                    mode: isOnlineMode ? "Online" : (isOfflineMode ? "Offline" : "Both"),
                    meetingLink: session.meetingLink,
                    meetingLocation: session.meetingLocation,
                    status: "upcoming"
                });
                await associatedExchange.save();
            }
        }

        // 11. Notify counterpart
        try {
            await Notification.create({
                recipient: targetPartner._id,
                sender: req.user._id,
                type: "session",
                title: "New Session Scheduled",
                text: `${req.user.name || "A partner"} scheduled a ${mode} session with you for ${skill} on ${date} at ${time}.`,
                link: `/sessions`
            });
        } catch (e) {
            console.error("Session schedule notification error:", e);
        }

        // 12. Return populated session
        const populated = await Session.findById(session._id)
            .populate("user", "name fullName photo avatar email role status")
            .populate("partner", "name fullName photo avatar email role status")
            .populate("exchangeId", "teach want mode status progress totalSessions completedSessions");

        res.status(201).json({
            success: true,
            message: `Session scheduled: ${skill} with ${targetPartner.name} on ${date} at ${time}.`,
            session: formatSessionForUser(populated, req.user._id)
        });

    } catch (error) {
        console.error("CreateSession Error:", error);
        res.status(500).json({ success: false, message: "Error scheduling session: " + error.message });
    }
};

// EDIT / RESCHEDULE SESSION
const updateSession = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid session ID format." });
        }

        const session = await Session.findById(id);
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found." });
        }

        // Check participant authorization
        if (!checkParticipant(session, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to modify this session."
            });
        }

        // Completed and cancelled sessions cannot be modified
        if (session.status === "completed") {
            return res.status(400).json({
                success: false,
                message: "Completed sessions cannot be edited or rescheduled."
            });
        }

        if (session.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Cancelled sessions cannot be edited or rescheduled."
            });
        }

        const { date, time, duration, mode, meetingLink, meetingLocation, skill, title, topic, notes, description } = req.body;

        // Date validation
        if (date) {
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ success: false, message: "Invalid date format." });
            }
            const todayStr = new Date().toISOString().split("T")[0];
            const sessionDateStr = parsedDate.toISOString().split("T")[0];
            if (sessionDateStr < todayStr) {
                return res.status(400).json({ success: false, message: "Session date cannot be in the past." });
            }
            session.date = date;
        }

        if (time) session.time = time;
        if (duration) session.duration = duration;
        if (skill && skill.trim()) session.skill = skill.trim();
        if (title && title.trim()) session.title = title.trim();
        if (topic !== undefined) session.topic = topic.trim();
        if (notes !== undefined) session.notes = notes.trim();
        if (description !== undefined) session.description = description.trim();

        const activeMode = mode || session.mode;
        if (mode) session.mode = mode;

        const isOnlineMode = activeMode.toLowerCase().includes("online");
        const isOfflineMode = activeMode.toLowerCase().includes("offline") || activeMode.toLowerCase().includes("in-person");

        if (meetingLink !== undefined) {
            session.meetingLink = meetingLink.trim();
        }
        if (isOnlineMode && (!session.meetingLink || !session.meetingLink.trim())) {
            return res.status(400).json({ success: false, message: "A valid meeting link is required for online sessions." });
        }

        if (meetingLocation !== undefined) {
            session.meetingLocation = meetingLocation.trim();
        }
        if (isOfflineMode && (!session.meetingLocation || !session.meetingLocation.trim())) {
            return res.status(400).json({ success: false, message: "A meeting location is required for offline sessions." });
        }

        await session.save();

        // Notify counterpart
        try {
            const counterpartId = session.user.toString() === req.user._id.toString() ? session.partner : session.user;
            await Notification.create({
                recipient: counterpartId,
                sender: req.user._id,
                type: "session",
                title: "Session Rescheduled",
                text: `${req.user.name || "A partner"} rescheduled the session for ${session.skill} to ${session.date} at ${session.time}.`,
                link: `/sessions`
            });
        } catch (e) {
            console.error("Reschedule notification error:", e);
        }

        const populated = await Session.findById(session._id)
            .populate("user", "name fullName photo avatar email role status")
            .populate("partner", "name fullName photo avatar email role status")
            .populate("exchangeId", "teach want mode status progress totalSessions completedSessions");

        res.status(200).json({
            success: true,
            message: "Session rescheduled and updated successfully.",
            session: formatSessionForUser(populated, req.user._id)
        });

    } catch (error) {
        console.error("UpdateSession Error:", error);
        res.status(500).json({ success: false, message: "Error updating session: " + error.message });
    }
};

// MARK SESSION COMPLETED & UPDATE EXCHANGE PROGRESS
const completeSession = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid session ID format." });
        }

        const session = await Session.findById(id);
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found." });
        }

        // Check participant authorization
        if (!checkParticipant(session, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to complete this session."
            });
        }

        // Prevent duplicate completion or completing cancelled session
        if (session.status === "completed") {
            return res.status(400).json({
                success: false,
                message: "Session is already completed."
            });
        }

        if (session.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Cancelled sessions cannot be marked as completed."
            });
        }

        session.status = "completed";
        await session.save();

        let updatedExchange = null;

        // Recalculate exchange progress if session belongs to an exchange
        if (session.exchangeId) {
            const exchange = await Exchange.findById(session.exchangeId);
            if (exchange) {
                // Count completed standalone sessions
                const completedCount = await Session.countDocuments({
                    exchangeId: exchange._id,
                    status: "completed"
                });

                exchange.completedSessions = completedCount;
                const total = (exchange.totalSessions && exchange.totalSessions > 0) ? exchange.totalSessions : 4;
                exchange.progress = Math.min(100, Math.round((completedCount / total) * 100));

                if (exchange.progress >= 100) {
                    exchange.status = "completed";
                    exchange.completedAt = new Date().toISOString();
                    if (exchange.agreement) exchange.agreement.status = "completed";
                }

                // Sync embedded milestone if present
                if (Array.isArray(exchange.sessions)) {
                    const m = exchange.sessions.find(
                        (s) => s.sessionNum === session.sessionNum || s.title === session.title
                    );
                    if (m) m.status = "completed";
                }

                await exchange.save();
                updatedExchange = exchange;
            }
        }

        // Notify counterpart
        try {
            const counterpartId = session.user.toString() === req.user._id.toString() ? session.partner : session.user;
            await Notification.create({
                recipient: counterpartId,
                sender: req.user._id,
                type: "completed",
                title: "Session Completed",
                text: `${req.user.name || "Your partner"} marked session "${session.title || session.skill}" as completed.`,
                link: `/sessions`
            });
        } catch (e) {
            console.error("Complete notification error:", e);
        }

        const populated = await Session.findById(session._id)
            .populate("user", "name fullName photo avatar email role status")
            .populate("partner", "name fullName photo avatar email role status")
            .populate("exchangeId", "teach want mode status progress totalSessions completedSessions");

        res.status(200).json({
            success: true,
            message: `Session "${session.title || session.skill}" marked as completed!`,
            session: formatSessionForUser(populated, req.user._id),
            exchange: updatedExchange
        });

    } catch (error) {
        console.error("CompleteSession Error:", error);
        res.status(500).json({ success: false, message: "Error completing session: " + error.message });
    }
};

// CANCEL SESSION (SOFT CANCELLATION PRESERVING AUDIT HISTORY)
const cancelSession = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid session ID format." });
        }

        const session = await Session.findById(id);
        if (!session) {
            return res.status(404).json({ success: false, message: "Session not found." });
        }

        // Check participant authorization
        if (!checkParticipant(session, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to cancel this session."
            });
        }

        if (session.status === "completed") {
            return res.status(400).json({
                success: false,
                message: "Completed sessions cannot be cancelled."
            });
        }

        if (session.status === "cancelled") {
            return res.status(400).json({
                success: false,
                message: "Session is already cancelled."
            });
        }

        session.status = "cancelled";
        await session.save();

        // Notify counterpart
        try {
            const counterpartId = session.user.toString() === req.user._id.toString() ? session.partner : session.user;
            await Notification.create({
                recipient: counterpartId,
                sender: req.user._id,
                type: "session",
                title: "Session Cancelled",
                text: `${req.user.name || "A partner"} cancelled the session for ${session.skill} scheduled on ${session.date}.`,
                link: `/sessions`
            });
        } catch (e) {
            console.error("Cancel notification error:", e);
        }

        const populated = await Session.findById(session._id)
            .populate("user", "name fullName photo avatar email role status")
            .populate("partner", "name fullName photo avatar email role status")
            .populate("exchangeId", "teach want mode status progress totalSessions completedSessions");

        res.status(200).json({
            success: true,
            message: "Session cancelled successfully.",
            session: formatSessionForUser(populated, req.user._id)
        });

    } catch (error) {
        console.error("CancelSession Error:", error);
        res.status(500).json({ success: false, message: "Error cancelling session: " + error.message });
    }
};

module.exports = {
    getMySessions,
    getSessionById,
    createSession,
    updateSession,
    completeSession,
    cancelSession
};
