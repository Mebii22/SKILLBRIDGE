const User = require("../models/User");
const Exchange = require("../models/Exchange");
const SkillListing = require("../models/SkillListing");
const Report = require("../models/Report");
const Activity = require("../models/Activity");
const Session = require("../models/Session");
const Notification = require("../models/Notification");

// GET ADMIN DASHBOARD STATS (REAL MONGODB COUNTS)
const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: "user" });
        const activeUsers = await User.countDocuments({ role: "user", status: "Active" });
        const disabledUsers = await User.countDocuments({ role: "user", status: "Disabled" });
        const usersForStats = await User.find({ role: "user" }).select("teaches wants");
        const totalSkills = usersForStats.reduce((acc, u) => acc + (u.teaches ? u.teaches.length : 0) + (u.wants ? u.wants.length : 0), 0);
        const totalExchanges = await Exchange.countDocuments();
        const pendingExchanges = await Exchange.countDocuments({ status: "pending" });
        const completedExchanges = await Exchange.countDocuments({ status: "completed" });
        const activeExchanges = await Exchange.countDocuments({ status: "active" });
        const cancelledExchanges = await Exchange.countDocuments({ status: { $in: ["cancelled", "rejected"] } });
        const totalSessions = await Session.countDocuments();
        const upcomingSessions = await Session.countDocuments({ status: "upcoming" });
        const completedSessions = await Session.countDocuments({ status: "completed" });
        const cancelledSessions = await Session.countDocuments({ status: "cancelled" });
        const openReports = await Report.countDocuments({ status: "open" });

        const recentUsers = await User.find({ role: "user" })
            .select("-password")
            .sort({ createdAt: -1 })
            .limit(5);

        const recentExchanges = await Exchange.find()
            .populate("requester", "name fullName photo email city location")
            .populate("partner", "name fullName photo email city location")
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(10);

        const activities = await Activity.find()
            .populate("admin", "name fullName email role")
            .sort({ createdAt: -1 })
            .limit(15);

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                disabledUsers,
                totalSkills,
                totalExchanges,
                pendingExchanges,
                completedExchanges,
                activeExchanges,
                cancelledExchanges,
                totalSessions,
                upcomingSessions,
                completedSessions,
                cancelledSessions,
                openReports
            },
            recentUsers: recentUsers.map((u) => ({ ...u.toObject(), id: u._id })),
            exchanges: recentExchanges.map((ex) => ({
                id: ex._id,
                _id: ex._id,
                requesterName: ex.requester ? (ex.requester.fullName || ex.requester.name) : "Member",
                requesterPhoto: ex.requester ? ex.requester.photo : "",
                partnerName: ex.partner ? (ex.partner.fullName || ex.partner.name) : "Partner",
                partnerPhoto: ex.partner ? ex.partner.photo : "",
                teach: ex.teach,
                want: ex.want,
                mode: ex.mode,
                totalSessions: ex.totalSessions || 4,
                completedSessions: ex.completedSessions || 0,
                progress: ex.progress || 0,
                status: ex.status,
                createdAt: ex.createdAt,
                updatedAt: ex.updatedAt
            })),
            activities: activities.map((a) => {
                const adminUser = a.admin && typeof a.admin === "object" ? a.admin : null;
                const adminName = a.adminName || (adminUser ? (adminUser.fullName || adminUser.name) : "SKILLBRIDGE Admin");
                return {
                    id: a._id,
                    _id: a._id,
                    admin: a.admin,
                    adminName,
                    action: a.action,
                    targetType: a.targetType,
                    targetName: a.targetName,
                    reason: a.reason,
                    text: a.text,
                    time: a.time,
                    createdAt: a.createdAt
                };
            })
        });

    } catch (error) {
        console.error("GetAdminStats Error:", error);
        res.status(500).json({ success: false, message: "Error fetching admin stats" });
    }
};

// GET ALL USERS FOR ADMIN (WITH SEARCH & STATUS FILTER)
const getAdminUsers = async (req, res) => {
    try {
        const { q, status } = req.query;
        const filter = { role: { $ne: "admin" } };

        if (status && status !== "All") {
            filter.status = status;
        }

        if (q && q.trim()) {
            const regex = new RegExp(q.trim(), "i");
            filter.$or = [
                { name: regex },
                { fullName: regex },
                { email: regex },
                { city: regex },
                { location: regex }
            ];
        }

        const users = await User.find(filter).select("-password").sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            users: users.map((u) => ({
                ...u.toObject(),
                id: u._id,
                joined: u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Member"
            }))
        });

    } catch (error) {
        console.error("GetAdminUsers Error:", error);
        res.status(500).json({ success: false, message: "Error fetching users for admin" });
    }
};

// TOGGLE USER STATUS (ACTIVE <-> DISABLED)
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Prevent modifying administrator accounts
        if (user.role === "admin") {
            return res.status(400).json({ success: false, message: "Cannot disable an administrator account" });
        }

        const newStatus = user.status === "Active" ? "Disabled" : "Active";
        user.status = newStatus;
        await user.save();

        const adminName = req.user.fullName || req.user.name || "SKILLBRIDGE Admin";
        const targetName = user.fullName || user.name || user.email;

        // Log admin activity
        await Activity.create({
            admin: req.user._id,
            adminName,
            action: newStatus === "Disabled" ? "USER_DISABLED" : "USER_ACTIVATED",
            targetType: "User",
            targetId: user._id.toString(),
            targetName,
            text: `User '${targetName}' (${user.email}) was ${newStatus === "Disabled" ? "disabled" : "reactivated"} by ${adminName}`,
            time: "Just now"
        });

        res.status(200).json({
            success: true,
            message: `User '${targetName}' is now ${newStatus}`,
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                fullName: user.fullName,
                email: user.email,
                status: user.status
            }
        });

    } catch (error) {
        console.error("ToggleUserStatus Error:", error);
        res.status(500).json({ success: false, message: "Error toggling user status" });
    }
};

// PERMANENT DELETE USER (WITH CONFIRMATION, REASON & RELATIONSHIP CLEANUP)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};

        if (!reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: "A deletion reason is required for permanent account deletion."
            });
        }

        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (user.role === "admin") {
            return res.status(400).json({ success: false, message: "Cannot delete an administrator account" });
        }

        const adminName = req.user.fullName || req.user.name || "SKILLBRIDGE Admin";
        const targetName = user.fullName || user.name || user.email;
        const deletionReason = reason.trim();

        // 1. Delete user's skill listings
        await SkillListing.deleteMany({
            $or: [{ user: id }, { userId: id }]
        });

        // 2. Remove user from all savedProfiles lists
        await User.updateMany(
            { savedProfiles: id },
            { $pull: { savedProfiles: id } }
        );

        // 3. Cancel active or pending exchanges involving this user
        await Exchange.updateMany(
            {
                $or: [{ requester: id }, { partner: id }],
                status: { $in: ["pending", "active"] }
            },
            {
                $set: {
                    status: "cancelled",
                    "agreement.status": "cancelled"
                }
            }
        );

        // 4. Remove session records involving this user
        await Session.deleteMany({
            $or: [{ user: id }, { partner: id }, { createdBy: id }]
        });

        // 5. Remove notifications sent to or from this user
        await Notification.deleteMany({
            $or: [{ recipient: id }, { sender: id }]
        });

        // 6. Delete User document
        await User.findByIdAndDelete(id);

        // 7. Log administrative activity record
        await Activity.create({
            admin: req.user._id,
            adminName,
            action: "USER_DELETED",
            targetType: "User",
            targetId: id.toString(),
            targetName,
            reason: deletionReason,
            text: `User account '${targetName}' (${user.email}) was permanently removed by ${adminName}. Reason: ${deletionReason}`,
            time: "Just now"
        });

        res.status(200).json({
            success: true,
            message: `User '${targetName}' and associated records have been permanently removed.`
        });

    } catch (error) {
        console.error("DeleteUser Error:", error);
        res.status(500).json({ success: false, message: "Error deleting user: " + error.message });
    }
};

// Helper functions to safely extract and normalize skill strings
const getSkillString = (val) => {
    if (!val) return "";
    if (typeof val === "string") return val.trim();
    if (typeof val === "object" && val !== null) {
        return (val.skill || val.name || val.title || val.label || "").toString().trim();
    }
    return String(val).trim();
};

const normalizeForComparison = (str) => {
    return getSkillString(str).toLowerCase().replace(/\s+/g, " ");
};

// GET USER PROFILE SKILLS FOR ADMIN
const getAdminSkills = async (req, res) => {
    try {
        const { q, type } = req.query;

        // Query all non-admin registered users
        const users = await User.find({ role: { $ne: "admin" } })
            .select("-password")
            .sort({ updatedAt: -1, createdAt: -1 });

        const skillsList = [];

        for (const u of users) {
            // Process 'teaches' (Skills I Can Teach)
            if (Array.isArray(u.teaches)) {
                for (const item of u.teaches) {
                    const skillStr = getSkillString(item);
                    if (skillStr) {
                        skillsList.push({
                            id: `${u._id}_teach_${encodeURIComponent(skillStr)}`,
                            skill: skillStr,
                            type: "Teach",
                            typeLabel: "Skills I Can Teach",
                            userId: u._id,
                            userName: u.fullName || u.name,
                            userEmail: u.email,
                            userPhoto: u.photo || "",
                            userCity: u.city || u.location || "",
                            userLocation: u.location || u.city || "",
                            userBio: u.bio || "",
                            userStatus: u.status,
                            userRating: u.rating || 5,
                            userCompleted: u.completed || 0,
                            userTeaches: (u.teaches || []).map(getSkillString).filter(Boolean),
                            userWants: (u.wants || []).map(getSkillString).filter(Boolean),
                            category: u.category || "Technology",
                            updatedAt: u.updatedAt || u.createdAt,
                            createdAt: u.createdAt
                        });
                    }
                }
            }

            // Process 'wants' (Skills I Want to Learn)
            if (Array.isArray(u.wants)) {
                for (const item of u.wants) {
                    const skillStr = getSkillString(item);
                    if (skillStr) {
                        skillsList.push({
                            id: `${u._id}_learn_${encodeURIComponent(skillStr)}`,
                            skill: skillStr,
                            type: "Learn",
                            typeLabel: "Skills I Want to Learn",
                            userId: u._id,
                            userName: u.fullName || u.name,
                            userEmail: u.email,
                            userPhoto: u.photo || "",
                            userCity: u.city || u.location || "",
                            userLocation: u.location || u.city || "",
                            userBio: u.bio || "",
                            userStatus: u.status,
                            userRating: u.rating || 5,
                            userCompleted: u.completed || 0,
                            userTeaches: (u.teaches || []).map(getSkillString).filter(Boolean),
                            userWants: (u.wants || []).map(getSkillString).filter(Boolean),
                            category: u.category || "Technology",
                            updatedAt: u.updatedAt || u.createdAt,
                            createdAt: u.createdAt
                        });
                    }
                }
            }
        }

        // Apply filters
        let results = skillsList;

        if (type && type !== "All") {
            const normType = type.toLowerCase();
            results = results.filter((item) => {
                if (normType === "teach" || normType.includes("teach")) return item.type === "Teach";
                if (normType === "learn" || normType.includes("learn") || normType.includes("want")) return item.type === "Learn";
                return true;
            });
        }

        if (q && q.trim()) {
            const queryLower = q.trim().toLowerCase();
            results = results.filter((item) =>
                item.skill.toLowerCase().includes(queryLower) ||
                item.userName.toLowerCase().includes(queryLower) ||
                item.userEmail.toLowerCase().includes(queryLower) ||
                item.userCity.toLowerCase().includes(queryLower) ||
                item.category.toLowerCase().includes(queryLower)
            );
        }

        res.status(200).json({
            success: true,
            count: results.length,
            skills: results
        });

    } catch (error) {
        console.error("GetAdminSkills Error:", error);
        res.status(500).json({ success: false, message: "Error fetching user skills for admin" });
    }
};

// REMOVE USER PROFILE SKILL (ADMIN ACTION)
const removeSkill = async (req, res) => {
    try {
        let { userId, skill, type, reason } = req.body || {};

        if (!userId && req.query?.userId) userId = req.query.userId;
        if (!skill && req.query?.skill) skill = req.query.skill;
        if (!type && req.query?.type) type = req.query.type;
        if (!reason && req.query?.reason) reason = req.query.reason;

        // Support composite ID in params: /api/admin/skills/:id (e.g. userId_teach_skill)
        if ((!userId || !skill) && req.params?.id && req.params.id.includes("_")) {
            const parts = req.params.id.split("_");
            if (parts.length >= 3) {
                userId = userId || parts[0];
                type = type || (parts[1].toLowerCase() === "teach" ? "Teach" : "Learn");
                skill = skill || decodeURIComponent(parts.slice(2).join("_"));
            }
        }

        // Validate mandatory deletion reason
        if (!reason || !String(reason).trim()) {
            return res.status(400).json({
                success: false,
                message: "A removal reason is mandatory when removing a user skill."
            });
        }

        // Safely extract skill string
        const skillName = getSkillString(skill);

        // Validate user and skill
        if (!userId || !skillName) {
            return res.status(400).json({
                success: false,
                message: "Target user ID and skill name are required."
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Target user not found."
            });
        }

        const targetLower = normalizeForComparison(skillName);
        let removed = false;
        let skillCategory = "";

        const isTeach = type && (type.toLowerCase() === "teach" || type.toLowerCase() === "teaches");
        const isLearn = type && (type.toLowerCase() === "learn" || type.toLowerCase() === "wants");

        // 1. Try removing from target array based on type
        if (isTeach && Array.isArray(user.teaches)) {
            const initialLen = user.teaches.length;
            user.teaches = user.teaches.filter(s => normalizeForComparison(s) !== targetLower);
            if (user.teaches.length !== initialLen) {
                removed = true;
                skillCategory = "Skills I Can Teach";
            }
        } else if (isLearn && Array.isArray(user.wants)) {
            const initialLen = user.wants.length;
            user.wants = user.wants.filter(s => normalizeForComparison(s) !== targetLower);
            if (user.wants.length !== initialLen) {
                removed = true;
                skillCategory = "Skills I Want to Learn";
            }
        }

        // 2. Fallback: If not found, check both arrays to prevent false negatives from type mismatch
        if (!removed && Array.isArray(user.teaches)) {
            const initialLen = user.teaches.length;
            user.teaches = user.teaches.filter(s => normalizeForComparison(s) !== targetLower);
            if (user.teaches.length !== initialLen) {
                removed = true;
                skillCategory = "Skills I Can Teach";
            }
        }

        if (!removed && Array.isArray(user.wants)) {
            const initialLen = user.wants.length;
            user.wants = user.wants.filter(s => normalizeForComparison(s) !== targetLower);
            if (user.wants.length !== initialLen) {
                removed = true;
                skillCategory = "Skills I Want to Learn";
            }
        }

        if (!removed) {
            return res.status(404).json({
                success: false,
                message: `Skill '${skillName}' not found in user's profile skills.`
            });
        }

        await user.save();

        // Also clean up any matching legacy SkillListing records if present
        try {
            await SkillListing.deleteMany({
                $or: [{ user: user._id }, { userId: user._id }],
                skill: new RegExp(`^${skillName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")
            });
        } catch (listingErr) {
            // Ignore non-blocking legacy cleanup error
        }

        // Record in Admin Activity Log
        const adminName = req.user.fullName || req.user.name || "SKILLBRIDGE Admin";
        const targetUserName = user.fullName || user.name || user.email;

        await Activity.create({
            admin: req.user._id,
            adminName,
            action: "SKILL_REMOVED",
            targetType: "UserSkill",
            targetId: user._id.toString(),
            targetName: `${skillName} (${targetUserName})`,
            reason: String(reason).trim(),
            text: `Skill '${skillName}' (${skillCategory || type || "Profile Skill"}) was removed from user '${targetUserName}' (${user.email}) by ${adminName}. Reason: ${String(reason).trim()}`,
            time: "Just now"
        });

        res.status(200).json({
            success: true,
            message: `Skill '${skillName}' was successfully removed from ${targetUserName}'s profile.`,
            removedSkill: skillName,
            userId: user._id,
            type: skillCategory.includes("Teach") ? "Teach" : "Learn"
        });

    } catch (error) {
        console.error("RemoveSkill Error:", error);
        res.status(500).json({ success: false, message: "Error removing skill: " + error.message });
    }
};

// Deprecated approval workflows maintained for graceful compatibility
const approveSkill = async (req, res) => {
    res.status(200).json({ success: true, message: "Approval workflow removed. Profile skills are active upon user save." });
};

const restoreSkill = async (req, res) => {
    res.status(200).json({ success: true, message: "Restore workflow removed. Skills are managed via user profile." });
};

// GET ALL EXCHANGES FOR ADMIN MONITORING
const getAdminExchanges = async (req, res) => {
    try {
        const { q, status } = req.query;
        const filter = {};

        if (status && status !== "All") {
            const normStatus = status.toLowerCase();
            if (normStatus === "cancelled" || normStatus === "rejected") {
                filter.status = { $in: ["cancelled", "rejected"] };
            } else {
                filter.status = normStatus;
            }
        }

        const exchanges = await Exchange.find(filter)
            .populate("requester", "name fullName photo email city location")
            .populate("partner", "name fullName photo email city location")
            .sort({ updatedAt: -1, createdAt: -1 });

        let results = exchanges;
        if (q && q.trim()) {
            const queryLower = q.trim().toLowerCase();
            results = exchanges.filter((ex) => {
                const reqName = ex.requester ? (ex.requester.fullName || ex.requester.name || "").toLowerCase() : "";
                const reqEmail = ex.requester ? (ex.requester.email || "").toLowerCase() : "";
                const partnerName = ex.partner ? (ex.partner.fullName || ex.partner.name || "").toLowerCase() : "";
                const partnerEmail = ex.partner ? (ex.partner.email || "").toLowerCase() : "";
                const teach = (ex.teach || "").toLowerCase();
                const want = (ex.want || "").toLowerCase();
                const eid = (ex._id ? ex._id.toString() : "").toLowerCase();
                return (
                    reqName.includes(queryLower) ||
                    reqEmail.includes(queryLower) ||
                    partnerName.includes(queryLower) ||
                    partnerEmail.includes(queryLower) ||
                    teach.includes(queryLower) ||
                    want.includes(queryLower) ||
                    eid.includes(queryLower)
                );
            });
        }

        res.status(200).json({
            success: true,
            count: results.length,
            exchanges: results.map((ex) => {
                const reqUser = ex.requester || null;
                const partUser = ex.partner || null;

                const reqName = reqUser ? (reqUser.fullName || reqUser.name || "Member") : (ex.requesterName || "Member");
                const partName = partUser ? (partUser.fullName || partUser.name || "Partner") : (ex.partnerName || "Partner");

                const teachSkill = ex.teach || "Skill";
                const wantSkill = ex.want || "Skill";
                const totalSess = ex.totalSessions || (ex.agreement && ex.agreement.totalSessions) || 4;
                const sessDuration = ex.duration || (ex.agreement && ex.agreement.duration) || "1 Hour";
                const sessSchedule = ex.schedule || (ex.agreement && ex.agreement.schedule) || "Weekly on mutually agreed time";
                const sessMode = ex.mode || (ex.agreement && ex.agreement.mode) || "Online";

                const defaultMyCommitment = `I will teach ${teachSkill} (${totalSess} sessions, ${sessDuration} each)`;
                const defaultPartnerCommitment = `${partName} will teach ${wantSkill} (${totalSess} sessions, ${sessDuration} each)`;

                return {
                    id: ex._id,
                    _id: ex._id,
                    requester: reqUser,
                    partner: partUser,
                    requesterName: reqName,
                    requesterEmail: reqUser ? (reqUser.email || "") : "",
                    requesterPhoto: reqUser ? (reqUser.photo || "") : "",
                    requesterCity: reqUser ? (reqUser.city || reqUser.location || "") : "",
                    partnerName: partName,
                    partnerEmail: partUser ? (partUser.email || "") : "",
                    partnerPhoto: partUser ? (partUser.photo || "") : "",
                    partnerCity: partUser ? (partUser.city || partUser.location || "") : "",
                    teach: teachSkill,
                    want: wantSkill,
                    mode: sessMode,
                    totalSessions: totalSess,
                    completedSessions: ex.completedSessions || 0,
                    progress: ex.progress || 0,
                    duration: sessDuration,
                    schedule: sessSchedule,
                    meetingLink: ex.meetingLink || (ex.agreement && ex.agreement.meetingLink) || "",
                    meetingLocation: ex.meetingLocation || (ex.agreement && ex.agreement.location) || "",
                    status: ex.status || "pending",
                    agreement: {
                        myCommitment: (ex.agreement && ex.agreement.myCommitment) ? ex.agreement.myCommitment : defaultMyCommitment,
                        partnerCommitment: (ex.agreement && ex.agreement.partnerCommitment) ? ex.agreement.partnerCommitment : defaultPartnerCommitment,
                        mode: (ex.agreement && ex.agreement.mode) || sessMode,
                        totalSessions: (ex.agreement && ex.agreement.totalSessions) || totalSess,
                        duration: (ex.agreement && ex.agreement.duration) || sessDuration,
                        schedule: (ex.agreement && ex.agreement.schedule) || sessSchedule,
                        meetingLink: (ex.agreement && ex.agreement.meetingLink) || ex.meetingLink || "",
                        location: (ex.agreement && ex.agreement.location) || ex.meetingLocation || "",
                        status: (ex.agreement && ex.agreement.status) || ex.status || "pending",
                        acceptedAt: (ex.agreement && ex.agreement.acceptedAt) ? ex.agreement.acceptedAt : null
                    },
                    sessions: ex.sessions || [],
                    rating: ex.rating,
                    review: ex.review,
                    createdAt: ex.createdAt,
                    updatedAt: ex.updatedAt
                };
            })
        });

    } catch (error) {
        console.error("GetAdminExchanges Error:", error);
        res.status(500).json({ success: false, message: "Error fetching exchanges for admin" });
    }
};

// GET ALL SESSIONS FOR ADMIN MONITORING (READ ONLY)
const getAdminSessions = async (req, res) => {
    try {
        const { q, status } = req.query;
        const filter = {};

        if (status && status !== "All") {
            filter.status = new RegExp(`^${status.trim()}$`, "i");
        }

        const sessions = await Session.find(filter)
            .populate("user", "name fullName photo email role status location city")
            .populate("partner", "name fullName photo email role status location city")
            .populate("createdBy", "name fullName photo email role status location city")
            .populate("exchangeId", "teach want status mode duration totalSessions completedSessions progress agreement")
            .sort({ date: 1, time: 1 });

        let results = sessions;
        if (q && q.trim()) {
            const queryLower = q.trim().toLowerCase();
            results = sessions.filter((s) => {
                const userName = s.user ? (s.user.fullName || s.user.name || "").toLowerCase() : "";
                const userEmail = s.user ? (s.user.email || "").toLowerCase() : "";
                const partnerName = s.partner ? (s.partner.fullName || s.partner.name || "").toLowerCase() : "";
                const partnerEmail = s.partner ? (s.partner.email || "").toLowerCase() : "";
                const skill = (s.skill || "").toLowerCase();
                const mode = (s.mode || "").toLowerCase();
                const date = (s.date || "").toLowerCase();
                const time = (s.time || "").toLowerCase();
                const sid = String(s._id || "").toLowerCase();
                return (
                    userName.includes(queryLower) ||
                    userEmail.includes(queryLower) ||
                    partnerName.includes(queryLower) ||
                    partnerEmail.includes(queryLower) ||
                    skill.includes(queryLower) ||
                    mode.includes(queryLower) ||
                    date.includes(queryLower) ||
                    time.includes(queryLower) ||
                    sid.includes(queryLower)
                );
            });
        }

        res.status(200).json({
            success: true,
            count: results.length,
            sessions: results.map((s) => {
                const creatorDoc = s.createdBy || s.user;
                return {
                    id: s._id,
                    _id: s._id,
                    user: s.user,
                    partner: s.partner,
                    createdBy: creatorDoc,
                    userName: s.user ? (s.user.fullName || s.user.name) : "Initiator",
                    userPhoto: s.user ? s.user.photo : "",
                    userEmail: s.user ? s.user.email : "",
                    userLocation: s.user ? (s.user.city || s.user.location || "") : "",
                    partnerName: s.partner ? (s.partner.fullName || s.partner.name) : "Partner",
                    partnerPhoto: s.partner ? s.partner.photo : "",
                    partnerEmail: s.partner ? s.partner.email : "",
                    partnerLocation: s.partner ? (s.partner.city || s.partner.location || "") : "",
                    creatorName: creatorDoc ? (creatorDoc.fullName || creatorDoc.name) : "Initiator",
                    creatorPhoto: creatorDoc ? creatorDoc.photo : "",
                    creatorEmail: creatorDoc ? creatorDoc.email : "",
                    creatorLocation: creatorDoc ? (creatorDoc.city || creatorDoc.location || "") : "",
                    exchange: s.exchangeId || null,
                    exchangeId: s.exchangeId ? (s.exchangeId._id || s.exchangeId) : null,
                    skill: s.skill,
                    description: s.description || "",
                    notes: s.notes || "",
                    date: s.date,
                    time: s.time,
                    duration: s.duration || "1 Hour",
                    mode: s.mode || "Online Video",
                    meetingLink: s.meetingLink || "",
                    meetingLocation: s.meetingLocation || "",
                    status: s.status || "upcoming",
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt
                };
            })
        });

    } catch (error) {
        console.error("GetAdminSessions Error:", error);
        res.status(500).json({ success: false, message: "Error fetching sessions for admin" });
    }
};

// GET ADMIN ACTIVITY LOGS
const getAdminActivities = async (req, res) => {
    try {
        const activities = await Activity.find()
            .populate("admin", "name fullName email")
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(200).json({
            success: true,
            count: activities.length,
            activities: activities.map((a) => ({
                id: a._id,
                _id: a._id,
                admin: a.admin,
                adminName: a.adminName || (a.admin ? a.admin.fullName || a.admin.name : "Administrator"),
                action: a.action,
                targetType: a.targetType,
                targetId: a.targetId,
                targetName: a.targetName,
                reason: a.reason,
                text: a.text,
                time: a.time,
                createdAt: a.createdAt
            }))
        });

    } catch (error) {
        console.error("GetAdminActivities Error:", error);
        res.status(500).json({ success: false, message: "Error fetching activities for admin" });
    }
};

// GET REPORTS FOR ADMIN
const getReports = async (req, res) => {
    try {
        const reports = await Report.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: reports.length,
            reports: reports.map((r) => ({ ...r.toObject(), id: r._id }))
        });

    } catch (error) {
        console.error("GetReports Error:", error);
        res.status(500).json({ success: false, message: "Error fetching reports" });
    }
};

// SUBMIT REPORT (USER OR ADMIN)
const submitReport = async (req, res) => {
    try {
        const { target, targetId, reason } = req.body;

        if (!target || !reason) {
            return res.status(400).json({ success: false, message: "Target name and reason are required" });
        }

        const report = await Report.create({
            from: req.user.fullName || req.user.name,
            reporterId: req.user._id,
            target: target.trim(),
            targetId,
            reason: reason.trim(),
            status: "open"
        });

        res.status(201).json({
            success: true,
            message: "Report submitted to administrators for review",
            report: { ...report.toObject(), id: report._id }
        });

    } catch (error) {
        console.error("SubmitReport Error:", error);
        res.status(500).json({ success: false, message: "Error submitting report" });
    }
};

// REVIEW REPORT
const reviewReport = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        report.status = "reviewed";
        await report.save();

        res.status(200).json({
            success: true,
            message: "Report marked as reviewed",
            report: { ...report.toObject(), id: report._id }
        });

    } catch (error) {
        console.error("ReviewReport Error:", error);
        res.status(500).json({ success: false, message: "Error reviewing report" });
    }
};

// RESOLVE REPORT
const resolveReport = async (req, res) => {
    try {
        const { id } = req.params;
        const report = await Report.findById(id);

        if (!report) {
            return res.status(404).json({ success: false, message: "Report not found" });
        }

        report.status = "resolved";
        await report.save();

        const adminName = req.user.fullName || req.user.name || "SKILLBRIDGE Admin";

        await Activity.create({
            admin: req.user._id,
            adminName,
            action: "REPORT_RESOLVED",
            targetType: "Report",
            targetId: report._id.toString(),
            targetName: report.target,
            text: `Report on '${report.target}' regarding '${report.reason.substring(0, 40)}' was resolved by ${adminName}`,
            time: "Just now"
        });

        res.status(200).json({
            success: true,
            message: "Report marked as resolved",
            report: { ...report.toObject(), id: report._id }
        });

    } catch (error) {
        console.error("ResolveReport Error:", error);
        res.status(500).json({ success: false, message: "Error resolving report" });
    }
};

module.exports = {
    getAdminStats,
    getAdminUsers,
    toggleUserStatus,
    deleteUser,
    getAdminSkills,
    approveSkill,
    removeSkill,
    restoreSkill,
    getAdminExchanges,
    getAdminSessions,
    getAdminActivities,
    getReports,
    submitReport,
    reviewReport,
    resolveReport
};
