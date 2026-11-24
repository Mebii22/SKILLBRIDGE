const mongoose = require("mongoose");
const Exchange = require("../models/Exchange");
const User = require("../models/User");
const Notification = require("../models/Notification");
const SkillListing = require("../models/SkillListing");

// In-memory concurrency guard per user-exchange pair
const activeReviewLocks = new Set();

// Format exchange document for the viewer so partnerName, partnerPhoto, partnerId point to the counterpart,
// while explicit sender & recipient fields are also provided for Incoming and Sent request views.
const formatExchangeForUser = (ex, currentUserId) => {
    const requesterId = ex.requester?._id ? ex.requester._id.toString() : ex.requester?.toString();
    const partnerId = ex.partner?._id ? ex.partner._id.toString() : ex.partner?.toString();
    const currentIdStr = currentUserId ? currentUserId.toString() : "";
    const isRequester = requesterId === currentIdStr;
    const otherUser = isRequester ? ex.partner : ex.requester;
    const senderUser = ex.requester;
    const recipientUser = ex.partner;

    // Next upcoming session
    const upcomingSession = (ex.sessions || []).find((s) => s.status === "upcoming");

    const exObj = ex.toObject ? ex.toObject() : { ...ex };

    // Review status for current user and exchange
    const myReview = (ex.reviews || []).find(
        (r) => r.reviewer && r.reviewer.toString() === currentIdStr
    );
    const partnerReview = (ex.reviews || []).find(
        (r) => r.reviewer && r.reviewer.toString() !== currentIdStr
    );

    return {
        ...exObj,
        id: ex._id,
        isRequester,
        hasReviewed: Boolean(myReview || (ex.rating && isRequester)),
        myReview: myReview || (ex.rating && isRequester ? { rating: ex.rating, review: ex.review } : null),
        partnerReview: partnerReview || null,
        partnerId: otherUser?._id || otherUser,
        partnerName: otherUser?.name || otherUser?.fullName || "Partner",
        partnerPhoto: otherUser?.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
        partnerLocation: otherUser?.location || otherUser?.city || "Everywhere",
        partnerRating: typeof otherUser?.rating === "number" ? otherUser.rating : 0,
        sender: senderUser ? {
            id: senderUser._id || senderUser,
            name: senderUser.name || senderUser.fullName || "Sender",
            photo: senderUser.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            location: senderUser.location || senderUser.city || "Everywhere",
            rating: typeof senderUser.rating === "number" ? senderUser.rating : 0,
            city: senderUser.city || "",
        } : null,
        recipient: recipientUser ? {
            id: recipientUser._id || recipientUser,
            name: recipientUser.name || recipientUser.fullName || "Recipient",
            photo: recipientUser.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            location: recipientUser.location || recipientUser.city || "Everywhere",
            rating: typeof recipientUser.rating === "number" ? recipientUser.rating : 0,
            city: recipientUser.city || "",
        } : null,
        message: ex.message || "",
        preferredDate: ex.preferredDate || "",
        preferredTime: ex.preferredTime || "",
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
            message = "",
            totalSessions = 4,
            duration = "1 Hour",
            schedule = "Weekly on mutually agreed time",
            mode = "Online",
            meetingLink,
            meetingLocation,
            preferredDate,
            preferredTime
        } = req.body;

        // 1. Validate ObjectId format
        if (!partnerId || !mongoose.Types.ObjectId.isValid(partnerId)) {
            return res.status(400).json({ success: false, message: "Invalid recipient partner ID format." });
        }

        // 2. Prevent self-swapping
        if (partnerId.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: "You cannot start a skill swap with yourself." });
        }

        // 3. Sender state checks
        if (req.user.status === "Disabled") {
            return res.status(403).json({ success: false, message: "Disabled accounts cannot initiate exchange requests." });
        }
        if (req.user.role === "admin") {
            return res.status(400).json({ success: false, message: "Administrators cannot initiate skill exchange requests." });
        }

        // 4. Recipient state checks
        const partnerUser = await User.findById(partnerId);
        if (!partnerUser) {
            return res.status(404).json({ success: false, message: "Selected recipient partner not found." });
        }
        if (partnerUser.status === "Disabled") {
            return res.status(400).json({ success: false, message: "Cannot send an exchange request to a disabled user account." });
        }
        if (partnerUser.role === "admin") {
            return res.status(400).json({ success: false, message: "Cannot send an exchange request to an administrator account." });
        }

        // 5. Skills validation
        const teachSkill = String(teach || "").trim();
        const wantSkill = String(want || "").trim();

        if (!teachSkill || !wantSkill) {
            return res.status(400).json({ success: false, message: "Both offered skill and requested skill are required." });
        }

        if (teachSkill.toLowerCase() === wantSkill.toLowerCase()) {
            return res.status(400).json({ success: false, message: "Offered skill and requested skill must be different." });
        }

        // Check skills against teaches / listings
        const senderTeachesList = (req.user.teaches || []).map((s) => String(s).toLowerCase().trim());
        const senderListings = await SkillListing.find({ user: req.user._id, status: "approved" }).lean();
        const senderListingSkills = senderListings
            .flatMap((l) => [l.skill, l.teachSkill, l.title].filter(Boolean))
            .map((s) => String(s).toLowerCase().trim());
        const allSenderSkills = new Set([...senderTeachesList, ...senderListingSkills]);

        if (allSenderSkills.size > 0 && !allSenderSkills.has(teachSkill.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: `You do not have "${teachSkill}" listed in your profile skills or published listings.`
            });
        }

        const recipientTeachesList = (partnerUser.teaches || []).map((s) => String(s).toLowerCase().trim());
        const recipientListings = await SkillListing.find({ user: partnerUser._id, status: "approved" }).lean();
        const recipientListingSkills = recipientListings
            .flatMap((l) => [l.skill, l.teachSkill, l.title].filter(Boolean))
            .map((s) => String(s).toLowerCase().trim());
        const allRecipientSkills = new Set([...recipientTeachesList, ...recipientListingSkills]);

        if (allRecipientSkills.size > 0 && !allRecipientSkills.has(wantSkill.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: `Recipient ${partnerUser.name} does not have "${wantSkill}" listed in their profile skills or published listings.`
            });
        }

        // 6. Duplicate pending check
        const existingPending = await Exchange.findOne({
            requester: req.user._id,
            partner: partnerUser._id,
            status: "pending"
        });
        if (existingPending) {
            return res.status(400).json({
                success: false,
                message: "You already have a pending exchange request with this partner."
            });
        }

        const reversePending = await Exchange.findOne({
            requester: partnerUser._id,
            partner: req.user._id,
            status: "pending"
        });
        if (reversePending) {
            return res.status(400).json({
                success: false,
                message: `${partnerUser.name} has already sent you a pending exchange request. Please check your incoming requests.`
            });
        }

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
            message: String(message || "").trim(),
            mode,
            totalSessions: numSessions,
            completedSessions: 0,
            progress: 0,
            duration,
            schedule,
            preferredDate: preferredDate || "",
            preferredTime: preferredTime || "",
            meetingLink: defaultMeetLink,
            meetingLocation: defaultMeetLoc,
            status: "pending",
            agreement,
            sessions: generatedSessions
        });

        // Create notification for partner (recipient)
        try {
            await Notification.create({
                recipient: partnerUser._id,
                sender: req.user._id,
                type: "request",
                title: "New Skill Exchange Request",
                text: `${req.user.name} sent you an exchange request to swap ${teachSkill} for ${wantSkill}!`,
                link: `/exchanges`
            });
        } catch (e) {
            console.error("Notif error:", e);
        }

        const populated = await Exchange.findById(exchange._id)
            .populate("requester", "-password -resetPasswordToken -resetPasswordExpire")
            .populate("partner", "-password -resetPasswordToken -resetPasswordExpire");

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
        const { status, type } = req.query;

        const filter = {};

        if (type === "incoming") {
            filter.partner = userId;
        } else if (type === "sent" || type === "outgoing") {
            filter.requester = userId;
        } else {
            filter.$or = [{ requester: userId }, { partner: userId }];
        }

        if (status && status !== "all") {
            if (status === "active") {
                filter.status = { $in: ["active", "accepted"] };
            } else {
                filter.status = status;
            }
        }

        const exchanges = await Exchange.find(filter)
            .populate("requester", "-password -resetPasswordToken -resetPasswordExpire")
            .populate("partner", "-password -resetPasswordToken -resetPasswordExpire")
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
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid exchange ID format." });
        }

        const exchange = await Exchange.findById(id)
            .populate("requester", "-password -resetPasswordToken -resetPasswordExpire")
            .populate("partner", "-password -resetPasswordToken -resetPasswordExpire");

        if (!exchange) {
            return res.status(404).json({ success: false, message: "Exchange agreement not found." });
        }

        const isParticipant =
            exchange.requester._id.toString() === req.user._id.toString() ||
            exchange.partner._id.toString() === req.user._id.toString() ||
            req.user.role === "admin";

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: "Not authorized to view this exchange." });
        }

        res.status(200).json({
            success: true,
            exchange: formatExchangeForUser(exchange, req.user._id)
        });

    } catch (error) {
        console.error("GetExchangeById Error:", error);
        res.status(500).json({ success: false, message: "Error fetching exchange details." });
    }
};

// ACCEPT EXCHANGE REQUEST
const acceptExchange = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid exchange ID format." });
        }

        const exchange = await Exchange.findById(id);
        if (!exchange) {
            return res.status(404).json({ success: false, message: "Exchange not found." });
        }

        // Only the recipient (partner) can accept
        if (exchange.partner.toString() !== req.user._id.toString()) {
            if (exchange.requester.toString() === req.user._id.toString()) {
                return res.status(403).json({ success: false, message: "You cannot accept your own exchange request." });
            }
            return res.status(403).json({ success: false, message: "Only the designated recipient can accept this exchange request." });
        }

        // Can only accept if currently pending
        if (exchange.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: `Cannot accept this exchange because it is already ${exchange.status}.`
            });
        }

        exchange.status = "active";
        if (!exchange.agreement) exchange.agreement = {};
        exchange.agreement.status = "active";
        exchange.agreement.acceptedAt = new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });

        await exchange.save();

        // Create notification for requester (sender)
        try {
            await Notification.create({
                recipient: exchange.requester,
                sender: req.user._id,
                type: "accepted",
                title: "Exchange Request Accepted!",
                text: `${req.user.name} accepted your skill exchange proposal for ${exchange.teach} ↔ ${exchange.want}!`,
                link: `/exchanges/${exchange._id}`
            });
        } catch (e) {
            console.error("Notif error:", e);
        }

        const populated = await Exchange.findById(exchange._id)
            .populate("requester", "-password -resetPasswordToken -resetPasswordExpire")
            .populate("partner", "-password -resetPasswordToken -resetPasswordExpire");

        res.status(200).json({
            success: true,
            message: "Skill exchange accepted! You are now learning partners.",
            exchange: formatExchangeForUser(populated, req.user._id)
        });

    } catch (error) {
        console.error("AcceptExchange Error:", error);
        res.status(500).json({ success: false, message: "Error accepting exchange." });
    }
};

// REJECT EXCHANGE REQUEST
const rejectExchange = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid exchange ID format." });
        }

        const exchange = await Exchange.findById(id);
        if (!exchange) {
            return res.status(404).json({ success: false, message: "Exchange not found." });
        }

        // Only the recipient (partner) can reject
        if (exchange.partner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only the designated recipient can reject this exchange request." });
        }

        // Can only reject if currently pending
        if (exchange.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: `Cannot reject this exchange because it is already ${exchange.status}.`
            });
        }

        exchange.status = "rejected";
        if (!exchange.agreement) exchange.agreement = {};
        exchange.agreement.status = "rejected";
        await exchange.save();

        // Create notification for requester (sender)
        try {
            await Notification.create({
                recipient: exchange.requester,
                sender: req.user._id,
                type: "rejected",
                title: "Exchange Request Declined",
                text: `${req.user.name} declined your skill exchange proposal for ${exchange.teach} ↔ ${exchange.want}.`,
                link: `/exchanges`
            });
        } catch (e) {
            console.error("Notif error:", e);
        }

        const populated = await Exchange.findById(exchange._id)
            .populate("requester", "-password -resetPasswordToken -resetPasswordExpire")
            .populate("partner", "-password -resetPasswordToken -resetPasswordExpire");

        res.status(200).json({
            success: true,
            message: "Exchange request declined.",
            exchange: formatExchangeForUser(populated, req.user._id)
        });

    } catch (error) {
        console.error("RejectExchange Error:", error);
        res.status(500).json({ success: false, message: "Error rejecting exchange." });
    }
};

// CANCEL EXCHANGE (SENDER CANCEL PENDING REQUEST)
const cancelExchange = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid exchange ID format." });
        }

        const exchange = await Exchange.findById(id);
        if (!exchange) {
            return res.status(404).json({ success: false, message: "Exchange not found." });
        }

        // Only the sender (requester) can cancel
        if (exchange.requester.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "Only the sender can cancel their pending exchange request." });
        }

        // Can only cancel if currently pending
        if (exchange.status !== "pending") {
            return res.status(400).json({
                success: false,
                message: `Cannot cancel this exchange because it is already ${exchange.status}.`
            });
        }

        exchange.status = "cancelled";
        if (!exchange.agreement) exchange.agreement = {};
        exchange.agreement.status = "cancelled";
        await exchange.save();

        // Create notification for partner (recipient)
        try {
            await Notification.create({
                recipient: exchange.partner,
                sender: req.user._id,
                type: "cancelled",
                title: "Exchange Request Cancelled",
                text: `${req.user.name} cancelled their pending skill exchange proposal.`,
                link: `/exchanges`
            });
        } catch (e) {
            console.error("Notif error:", e);
        }

        const populated = await Exchange.findById(exchange._id)
            .populate("requester", "-password -resetPasswordToken -resetPasswordExpire")
            .populate("partner", "-password -resetPasswordToken -resetPasswordExpire");

        res.status(200).json({
            success: true,
            message: "Exchange cancelled successfully.",
            exchange: formatExchangeForUser(populated, req.user._id)
        });

    } catch (error) {
        console.error("CancelExchange Error:", error);
        res.status(500).json({ success: false, message: "Error cancelling exchange." });
    }
};

// COMPLETE A SESSION MILESTONE
const completeSession = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid exchange ID format." });
        }

        const { sessionId, sessionNum } = req.body;

        const exchange = await Exchange.findById(id);
        if (!exchange) {
            return res.status(404).json({ success: false, message: "Exchange not found." });
        }

        const isParticipant =
            exchange.requester.toString() === req.user._id.toString() ||
            exchange.partner.toString() === req.user._id.toString();

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: "Not authorized to update this exchange." });
        }

        const session = exchange.sessions.find(
            (s) => (sessionId && s._id.toString() === sessionId.toString()) || (sessionNum && s.sessionNum === Number(sessionNum))
        );

        if (!session) {
            return res.status(404).json({ success: false, message: "Session milestone not found in this exchange." });
        }

        session.status = "completed";

        const completedCount = exchange.sessions.filter((s) => s.status === "completed").length;
        exchange.completedSessions = completedCount;
        const total = exchange.totalSessions || exchange.sessions.length || 4;
        exchange.progress = Math.min(100, Math.round((completedCount / total) * 100));

        if (exchange.progress === 100) {
            exchange.status = "completed";
            if (exchange.agreement) exchange.agreement.status = "completed";
        }

        await exchange.save();

        const populated = await Exchange.findById(exchange._id)
            .populate("requester", "-password -resetPasswordToken -resetPasswordExpire")
            .populate("partner", "-password -resetPasswordToken -resetPasswordExpire");

        res.status(200).json({
            success: true,
            message: `Marked ${session.title} as completed! Progress is now ${exchange.progress}%.`,
            exchange: formatExchangeForUser(populated, req.user._id)
        });

    } catch (error) {
        console.error("CompleteSession Error:", error);
        res.status(500).json({ success: false, message: "Error updating session progress." });
    }
};

// SUBMIT RATING & REVIEW FOR COMPLETED EXCHANGE
const submitReview = async (req, res) => {
    let lockKey = null;
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid exchange ID format." });
        }

        // Role & Account Status Checks: Admin and disabled accounts cannot use member reviews
        if (req.user && req.user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrators cannot submit member reviews."
            });
        }

        if (req.user && req.user.status !== "Active") {
            return res.status(403).json({
                success: false,
                message: "Disabled accounts cannot submit reviews."
            });
        }

        const { rating, review } = req.body;

        // Strict rating validation: must be integer 1 to 5
        const numRating = Number(rating);
        if (
            rating === undefined ||
            rating === null ||
            isNaN(numRating) ||
            !Number.isInteger(numRating) ||
            numRating < 1 ||
            numRating > 5
        ) {
            return res.status(400).json({
                success: false,
                message: "Rating must be an integer between 1 and 5."
            });
        }

        // Strict review text validation: non-empty string, max 2000 chars
        if (!review || typeof review !== "string" || !review.trim()) {
            return res.status(400).json({
                success: false,
                message: "Written feedback is required."
            });
        }

        const cleanReview = review.trim();
        if (cleanReview.length > 2000) {
            return res.status(400).json({
                success: false,
                message: "Review feedback cannot exceed 2000 characters."
            });
        }

        // In-flight concurrency lock per reviewer & exchange
        lockKey = `${req.user._id.toString()}:${id}`;
        if (activeReviewLocks.has(lockKey)) {
            return res.status(400).json({
                success: false,
                message: "You have already submitted a review for this exchange."
            });
        }
        activeReviewLocks.add(lockKey);

        const exchange = await Exchange.findById(id);
        if (!exchange) {
            return res.status(404).json({ success: false, message: "Exchange not found." });
        }

        const isRequester = exchange.requester.toString() === req.user._id.toString();
        const isPartner = exchange.partner.toString() === req.user._id.toString();

        if (!isRequester && !isPartner) {
            return res.status(403).json({ success: false, message: "You are not a participant in this exchange." });
        }

        // Enforce review eligibility: reviews allowed ONLY for genuinely completed exchanges
        if (exchange.status !== "completed") {
            return res.status(400).json({
                success: false,
                message: "Reviews can only be submitted for completed exchanges."
            });
        }

        // Derive recipient from exchange partner, never trust client-supplied ID
        const targetUserId = isRequester ? exchange.partner : exchange.requester;

        // Prevent self-review
        if (targetUserId.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot review yourself."
            });
        }

        const partnerUser = await User.findById(targetUserId);
        if (!partnerUser) {
            return res.status(404).json({ success: false, message: "Partner user not found." });
        }

        // Preliminary duplicate check
        const alreadyInExchange = (exchange.reviews || []).some(
            (r) => r.reviewer && r.reviewer.toString() === req.user._id.toString()
        );
        const alreadyInUser = (partnerUser.reviews || []).some(
            (r) =>
                r.fromId &&
                r.fromId.toString() === req.user._id.toString() &&
                r.exchangeId &&
                r.exchangeId.toString() === exchange._id.toString()
        );

        if (alreadyInExchange || alreadyInUser) {
            return res.status(400).json({
                success: false,
                message: "You have already submitted a review for this exchange."
            });
        }

        // ATOMIC MULTI-DOCUMENT TRANSACTION:
        // Covers: 1) Exchange.reviews write, 2) User.reviews write, 3) User.rating recalculation
        const session = await mongoose.startSession();
        session.startTransaction();

        let updatedExchange = null;
        let updatedPartner = null;
        let calculatedRating = 0;
        let totalValidCount = 0;

        try {
            // 1. Atomic conditional update to Exchange document within transaction
            updatedExchange = await Exchange.findOneAndUpdate(
                {
                    _id: id,
                    status: "completed",
                    "reviews.reviewer": { $ne: req.user._id }
                },
                {
                    $push: {
                        reviews: {
                            reviewer: req.user._id,
                            recipient: targetUserId,
                            rating: numRating,
                            review: cleanReview,
                            createdAt: new Date()
                        }
                    },
                    $set: {
                        rating: numRating,
                        review: cleanReview
                    }
                },
                { new: true, session }
            );

            if (!updatedExchange) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: "You have already submitted a review for this exchange."
                });
            }

            // 2. Atomic conditional update to Partner User document within transaction
            const reviewerName = req.user.fullName || req.user.name || "Peer Learner";
            const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

            updatedPartner = await User.findOneAndUpdate(
                {
                    _id: targetUserId,
                    reviews: {
                        $not: {
                            $elemMatch: {
                                exchangeId: exchange._id,
                                fromId: req.user._id
                            }
                        }
                    }
                },
                {
                    $push: {
                        reviews: {
                            $each: [{
                                from: reviewerName,
                                fromId: req.user._id,
                                exchangeId: exchange._id,
                                rating: numRating,
                                text: cleanReview,
                                date: dateStr,
                                createdAt: new Date()
                            }],
                            $position: 0
                        }
                    }
                },
                { new: true, session }
            );

            if (!updatedPartner) {
                await session.abortTransaction();
                return res.status(400).json({
                    success: false,
                    message: "You have already submitted a review for this exchange."
                });
            }

            // 3. Recalculate partnerUser average rating accurately from actual valid reviews within transaction
            const validReviews = (updatedPartner.reviews || []).filter(
                (r) => typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5
            );
            totalValidCount = validReviews.length;
            calculatedRating = totalValidCount > 0
                ? Number((validReviews.reduce((sum, r) => sum + r.rating, 0) / totalValidCount).toFixed(1))
                : 0;

            await User.findByIdAndUpdate(
                targetUserId,
                { rating: calculatedRating },
                { session }
            );

            // Commit all related database writes atomically
            await session.commitTransaction();

        } catch (txError) {
            await session.abortTransaction();
            if (
                txError.code === 112 ||
                (txError.hasErrorLabel && txError.hasErrorLabel("TransientTransactionError")) ||
                (txError.message && txError.message.includes("Write conflict"))
            ) {
                // Wait briefly for the competing concurrent transaction to complete its commit
                await new Promise((resolve) => setTimeout(resolve, 100));
                const checkEx = await Exchange.findById(id);
                const alreadyCommitted = (checkEx?.reviews || []).some(
                    (r) => r.reviewer && r.reviewer.toString() === req.user._id.toString()
                );
                if (alreadyCommitted) {
                    return res.status(400).json({
                        success: false,
                        message: "You have already submitted a review for this exchange."
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: "You have already submitted a review for this exchange."
                });
            }
            throw txError;
        } finally {
            session.endSession();
        }

        // 4. Dispatch Notification to recipient (after successful commit, with concurrency duplicate guard)
        try {
            const recentNotif = await Notification.findOne({
                recipient: targetUserId,
                sender: req.user._id,
                type: "review",
                createdAt: { $gte: new Date(Date.now() - 30000) }
            });

            if (!recentNotif) {
                const reviewerName = req.user.fullName || req.user.name || "Peer Learner";
                await Notification.create({
                    recipient: targetUserId,
                    sender: req.user._id,
                    type: "review",
                    title: "New Review Received!",
                    text: `${reviewerName} gave you a ${numRating}-star review: "${cleanReview.substring(0, 60)}${cleanReview.length > 60 ? "..." : ""}"`,
                    link: `/profile/${req.user._id}`
                });
            }
        } catch (e) {
            console.error("Notif error:", e);
        }

        const populated = await Exchange.findById(exchange._id)
            .populate("requester", "-password -resetPasswordToken -resetPasswordExpire")
            .populate("partner", "-password -resetPasswordToken -resetPasswordExpire");

        res.status(200).json({
            success: true,
            message: "Thank you! Your feedback has been recorded.",
            exchange: formatExchangeForUser(populated, req.user._id),
            rating: calculatedRating,
            reviewCount: totalValidCount
        });

    } catch (error) {
        console.error("SubmitReview Error:", error);
        res.status(500).json({ success: false, message: "Error submitting review." });
    } finally {
        if (lockKey) {
            activeReviewLocks.delete(lockKey);
        }
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
