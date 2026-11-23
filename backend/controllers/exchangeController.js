const Exchange = require("../models/Exchange");
const User = require("../models/User");
const Notification = require("../models/Notification");
const Session = require("../models/Session");

// Format exchange document for the viewer so partnerName, partnerPhoto, partnerId point to the counterpart
const formatExchangeForUser = (ex, currentUserId) => {
    const isRequester = ex.requester._id ? ex.requester._id.toString() === currentUserId.toString() : ex.requester.toString() === currentUserId.toString();
    const otherUser = isRequester ? ex.partner : ex.requester;

    // Next upcoming session
    const upcomingSession = (ex.sessions || []).find((s) => s.status === "upcoming");

    return {
        ...ex.toObject ? ex.toObject() : ex,
        id: ex._id,
        partnerId: otherUser._id || otherUser,
        partnerName: otherUser.name || otherUser.fullName || "Partner",
        partnerPhoto: otherUser.photo || "https://randomuser.me/api/portraits/men/32.jpg",
        partnerLocation: otherUser.location || otherUser.city || "Kerala",
        partnerRating: otherUser.rating || 5.0,
        isRequester,
        nextSession: upcomingSession ? {
            id: upcomingSession._id,
            sessionNum: upcomingSession.sessionNum,
            date: upcomingSession.date,
            time: upcomingSession.time,
            skill: upcomingSession.title,
            mode: upcomingSession.mode || ex.mode,
            meetingLink: upcomingSession.meetingLink || ex.meetingLink,
            meetingLocation: upcomingSession.meetingLocation || ex.meetingLocation
        } : null
    };
};

// CREATE EXCHANGE REQUEST (START SWAP)
const createExchange = async (req, res) => {
    try {
        const {
            partnerId,
            teach,
            want,
            totalSessions = 4,
            duration = "1 Hour",
            schedule = "Weekly on mutually agreed time",
            mode = "Online",
            meetingLink,
            meetingLocation,
            preferredDate,
            preferredTime
        } = req.body;

        if (!partnerId) {
            return res.status(400).json({ success: false, message: "Partner ID is required" });
        }

        if (partnerId.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: "You cannot start a skill swap with yourself." });
        }

        const partnerUser = await User.findById(partnerId);
        if (!partnerUser) {
            return res.status(404).json({ success: false, message: "Selected partner not found" });
        }

        const existingPending = await Exchange.findOne({
            $or: [
                { requester: req.user._id, partner: partnerUser._id, status: "pending" },
                { requester: partnerUser._id, partner: req.user._id, status: "pending" }
            ]
        });
        if (existingPending) {
            return res.status(400).json({
                success: false,
                message: "You already have a pending exchange proposal with this partner."
            });
        }

        const teachSkill = (teach || (req.user.teaches && req.user.teaches[0]) || "Skill").trim();
        const wantSkill = (want || (partnerUser.teaches && partnerUser.teaches[0]) || "Skill").trim();

        const numSessions = Number(totalSessions) || 4;
        const defaultMeetLink = mode === "Online" ? (meetingLink || "https://meet.google.com/sb-learn-hub") : "";
        const defaultMeetLoc = mode === "Offline" ? (meetingLocation || "Public Library / Cafe, Kerala") : "";

        // Generate planned session milestones
        const generatedSessions = Array.from({ length: numSessions }, (_, idx) => {
            const num = idx + 1;
            const targetDate = preferredDate || new Date(Date.now() + num * 7 * 86400000).toISOString().split("T")[0];
            return {
                sessionNum: num,
                title: `Session ${num}: ${num % 2 === 1 ? teachSkill : wantSkill}`,
                date: targetDate,
                time: preferredTime || "5:00 PM",
                duration,
                topic: num === 1 ? "Foundations & Goal Setting" : num === numSessions ? "Advanced Project & Review" : "Hands-on Practice & Exercises",
                mode,
                meetingLink: defaultMeetLink,
                meetingLocation: defaultMeetLoc,
                status: "upcoming"
            };
        });

        // Structured Agreement Contract
        const agreement = {
            myCommitment: `I will teach ${teachSkill} (${numSessions} sessions, ${duration} each)`,
            partnerCommitment: `${partnerUser.name} will teach ${wantSkill} (${numSessions} sessions, ${duration} each)`,
            mode,
            totalSessions: numSessions,
            duration,
            schedule,
            meetingLink: defaultMeetLink,
            location: defaultMeetLoc,
            status: "pending",
            acceptedAt: null
        };

        const exchange = await Exchange.create({
            requester: req.user._id,
            partner: partnerUser._id,
            teach: teachSkill,
            want: wantSkill,
            mode,
            totalSessions: numSessions,
            completedSessions: 0,
            progress: 0,
            duration,
            schedule,
            meetingLink: defaultMeetLink,
            meetingLocation: defaultMeetLoc,
            status: "pending",
            agreement,
            sessions: generatedSessions
        });

        // Create notification for partner
        try {
            await Notification.create({
                recipient: partnerUser._id,
                sender: req.user._id,
                type: "request",
                title: "New Skill Exchange Request",
                text: `${req.user.name} sent you an exchange request to swap ${teachSkill} for ${wantSkill}!`,
                link: `/exchanges/${exchange._id}`
            });
        } catch (e) {
            console.error("Notif error:", e);
        }

        const populated = await Exchange.findById(exchange._id)
            .populate("requester", "name fullName photo location city rating")
            .populate("partner", "name fullName photo location city rating");

        res.status(201).json({
            success: true,
            message: "Exchange agreement request sent successfully",
            exchange: formatExchangeForUser(populated, req.user._id)
        });

    } catch (error) {
        console.error("CreateExchange Error:", error);
        res.status(500).json({ success: false, message: "Error creating exchange: " + error.message });
    }
};

// GET CURRENT USER'S EXCHANGES
const getMyExchanges = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query;

        const filter = {
            $or: [{ requester: userId }, { partner: userId }]
        };

        if (status && status !== "all") {
            filter.status = status;
        }

        const exchanges = await Exchange.find(filter)
            .populate("requester", "name fullName photo location city rating")
            .populate("partner", "name fullName photo location city rating")
            .sort({ updatedAt: -1 });

        const formatted = exchanges.map((ex) => formatExchangeForUser(ex, userId));

        res.status(200).json({
            success: true,
            count: formatted.length,
            exchanges: formatted
        });

    } catch (error) {
        console.error("GetMyExchanges Error:", error);
        res.status(500).json({ success: false, message: "Error fetching exchanges" });
    }
};

// GET SINGLE EXCHANGE BY ID
const getExchangeById = async (req, res) => {
    try {
        const { id } = req.params;
        const exchange = await Exchange.findById(id)
            .populate("requester", "name fullName photo location city rating")
            .populate("partner", "name fullName photo location city rating");

        if (!exchange) {
            return res.status(404).json({ success: false, message: "Exchange agreement not found" });
        }

        const isParticipant =
            exchange.requester._id.toString() === req.user._id.toString() ||
            exchange.partner._id.toString() === req.user._id.toString() ||
            req.user.role === "admin";

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: "Not authorized to view this exchange" });
        }

        res.status(200).json({
            success: true,
            exchange: formatExchangeForUser(exchange, req.user._id)
        });

    } catch (error) {
        console.error("GetExchangeById Error:", error);
        res.status(500).json({ success: false, message: "Error fetching exchange details" });
    }
};

// ACCEPT EXCHANGE REQUEST
const acceptExchange = async (req, res) => {
    try {
        const { id } = req.params;
        const exchange = await Exchange.findById(id);

        if (!exchange) {
            return res.status(404).json({ success: false, message: "Exchange not found" });
        }

        // Only the recipient partner can accept
        if (exchange.partner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only the recipient can accept this exchange" });
        }

        exchange.status = "active";
        exchange.agreement.status = "active";
        exchange.agreement.acceptedAt = new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });

        await exchange.save();

        // Create notification for requester
        try {
            await Notification.create({
                recipient: exchange.requester,
                sender: req.user._id,
                type: "accepted",
                title: "Exchange Request Accepted!",
                text: `${req.user.name} accepted your skill exchange agreement! You can now start learning sessions.`,
                link: `/exchanges/${exchange._id}`
            });
        } catch (e) {
            console.error("Notif error:", e);
        }

        const populated = await Exchange.findById(exchange._id)
            .populate("requester", "name fullName photo location city rating")
            .populate("partner", "name fullName photo location city rating");

        res.status(200).json({
            success: true,
            message: "Skill exchange agreement accepted! You are now learning partners.",
            exchange: formatExchangeForUser(populated, req.user._id)
        });

    } catch (error) {
        console.error("AcceptExchange Error:", error);
        res.status(500).json({ success: false, message: "Error accepting exchange" });
    }
};

// REJECT EXCHANGE REQUEST
const rejectExchange = async (req, res) => {
    try {
        const { id } = req.params;
        const exchange = await Exchange.findById(id);

        if (!exchange) {
            return res.status(404).json({ success: false, message: "Exchange not found" });
        }

        if (exchange.partner.toString() !== req.user._id.toString() && exchange.requester.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Not authorized to reject this exchange" });
        }

        exchange.status = "cancelled";
        exchange.agreement.status = "cancelled";
        await exchange.save();

        res.status(200).json({
            success: true,
            message: "Exchange request declined"
        });

    } catch (error) {
        console.error("RejectExchange Error:", error);
        res.status(500).json({ success: false, message: "Error rejecting exchange" });
    }
};

// CANCEL EXCHANGE
const cancelExchange = async (req, res) => {
    try {
        const { id } = req.params;
        const exchange = await Exchange.findById(id);

        if (!exchange) {
            return res.status(404).json({ success: false, message: "Exchange not found" });
        }

        exchange.status = "cancelled";
        exchange.agreement.status = "cancelled";
        await exchange.save();

        res.status(200).json({
            success: true,
            message: "Exchange cancelled successfully"
        });

    } catch (error) {
        console.error("CancelExchange Error:", error);
        res.status(500).json({ success: false, message: "Error cancelling exchange" });
    }
};

// COMPLETE A SESSION MILESTONE
const completeSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { sessionId, sessionNum } = req.body;

        const exchange = await Exchange.findById(id);
        if (!exchange) {
            return res.status(404).json({ success: false, message: "Exchange not found" });
        }

        const session = exchange.sessions.find(
            (s) => (sessionId && s._id.toString() === sessionId.toString()) || (sessionNum && s.sessionNum === Number(sessionNum))
        );

        if (!session) {
            return res.status(404).json({ success: false, message: "Session milestone not found in this exchange" });
        }

        session.status = "completed";

        const completedCount = exchange.sessions.filter((s) => s.status === "completed").length;
        exchange.completedSessions = completedCount;
        const total = exchange.totalSessions || exchange.sessions.length || 4;
        exchange.progress = Math.min(100, Math.round((completedCount / total) * 100));

        if (exchange.progress === 100) {
            exchange.status = "completed";
            exchange.agreement.status = "completed";
        }

        await exchange.save();

        const populated = await Exchange.findById(exchange._id)
            .populate("requester", "name fullName photo location city rating")
            .populate("partner", "name fullName photo location city rating");

        res.status(200).json({
            success: true,
            message: `Marked ${session.title} as completed! Progress is now ${exchange.progress}%.`,
            exchange: formatExchangeForUser(populated, req.user._id)
        });

    } catch (error) {
        console.error("CompleteSession Error:", error);
        res.status(500).json({ success: false, message: "Error updating session progress" });
    }
};

// SUBMIT RATING & REVIEW FOR COMPLETED EXCHANGE
const submitReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, review } = req.body;

        if (!rating || !review || !review.trim()) {
            return res.status(400).json({ success: false, message: "Rating and review text are required" });
        }

        const exchange = await Exchange.findById(id);
        if (!exchange) {
            return res.status(404).json({ success: false, message: "Exchange not found" });
        }

        const isRequester = exchange.requester.toString() === req.user._id.toString();
        const isPartner = exchange.partner.toString() === req.user._id.toString();

        if (!isRequester && !isPartner) {
            return res.status(403).json({ success: false, message: "You are not a participant in this exchange" });
        }

        if (exchange.status !== "active" && exchange.status !== "completed") {
            return res.status(400).json({
                success: false,
                message: "Reviews can only be submitted for active or completed exchanges"
            });
        }

        // Target partner who is being reviewed
        const targetUserId = isRequester ? exchange.partner : exchange.requester;
        const partnerUser = await User.findById(targetUserId);

        if (!partnerUser) {
            return res.status(404).json({ success: false, message: "Partner user not found" });
        }

        // Prevent duplicate reviews
        const alreadyReviewed = (partnerUser.reviews || []).some(
            (r) => r.fromId && r.fromId.toString() === req.user._id.toString() && exchange.review
        );
        if (alreadyReviewed && exchange.rating) {
            return res.status(400).json({
                success: false,
                message: "You have already submitted a review for this exchange."
            });
        }

        // Save review to exchange
        exchange.rating = Number(rating);
        exchange.review = review.trim();
        exchange.status = "completed";
        exchange.progress = 100;
        await exchange.save();

        // Append review to partner's User profile and update rating & completed count
        if (!partnerUser.reviews) partnerUser.reviews = [];
        partnerUser.reviews.unshift({
            from: req.user.fullName || req.user.name,
            fromId: req.user._id,
            rating: Number(rating),
            text: review.trim(),
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        });

        partnerUser.completed = (partnerUser.completed || 0) + 1;

        const totalScore = partnerUser.reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0);
        partnerUser.rating = Number((totalScore / partnerUser.reviews.length).toFixed(1));

        await partnerUser.save();

        // Notification for partner
        try {
            await Notification.create({
                recipient: targetUserId,
                sender: req.user._id,
                type: "completed",
                title: "New Review Received!",
                text: `${req.user.name} reviewed your exchange: “${review.trim().substring(0, 80)}...” (${rating} ★)`,
                link: `/profile/${req.user._id}`
            });
        } catch (e) {
            console.error("Notif error:", e);
        }

        const populated = await Exchange.findById(exchange._id)
            .populate("requester", "name fullName photo location city rating")
            .populate("partner", "name fullName photo location city rating");

        res.status(200).json({
            success: true,
            message: "Thank you! Your feedback has been recorded.",
            exchange: formatExchangeForUser(populated, req.user._id)
        });

    } catch (error) {
        console.error("SubmitReview Error:", error);
        res.status(500).json({ success: false, message: "Error submitting review" });
    }
};

module.exports = {
    createExchange,
    getMyExchanges,
    getExchangeById,
    acceptExchange,
    rejectExchange,
    cancelExchange,
    completeSession,
    submitReview
};

