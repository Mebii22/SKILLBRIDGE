const mongoose = require("mongoose");
const User = require("../models/User");
const Exchange = require("../models/Exchange");
const Session = require("../models/Session");
const Notification = require("../models/Notification");
const SkillListing = require("../models/SkillListing");
const Conversation = require("../models/Conversation");
const bcrypt = require("bcryptjs");
const { calculateMatchScore } = require("../utils/matching");

// In-memory concurrency guard for profile notifications
const activeProfileNotifLocks = new Map();

// Helper for deduplicating skills case-insensitively and trimming
const dedupeSkills = (skills) => {
    const list = Array.isArray(skills)
        ? skills
        : typeof skills === "string"
        ? skills.split(",")
        : [];
    const seen = new Set();
    const result = [];
    for (const s of list) {
        const trimmed = String(s).trim();
        if (!trimmed) continue;
        const lower = trimmed.toLowerCase();
        if (!seen.has(lower)) {
            seen.add(lower);
            result.push(trimmed.slice(0, 50));
        }
    }
    return result.slice(0, 40);
};

// Social URL / handle sanitization against XSS and unsafe schemes
const sanitizeSocialValue = (val) => {
    if (!val || typeof val !== "string") return "";
    const trimmed = val.trim();
    const lower = trimmed.toLowerCase();
    if (
        lower.startsWith("javascript:") ||
        lower.startsWith("data:") ||
        lower.startsWith("vbscript:") ||
        lower.includes("<script") ||
        lower.includes("<") ||
        lower.includes(">")
    ) {
        return "";
    }
    return trimmed.slice(0, 150);
};

// GET ALL USERS (DISCOVER WITH SEARCH & FILTERS)
const getUsers = async (req, res) => {
    try {
        const { q, category, location, mode, sort, page = 1, limit = 50 } = req.query;

        // Current user ID if authenticated
        const currentUserId = req.user ? req.user._id : null;

        const filter = { status: "Active", role: "user" };

        if (currentUserId) {
            filter._id = { $ne: currentUserId };
        }

        // Query text search (skill name, user name, city, location, bio, category, wants)
        if (q && q.trim()) {
            const safeQ = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(safeQ, "i");
            filter.$or = [
                { name: regex },
                { fullName: regex },
                { city: regex },
                { location: regex },
                { bio: regex },
                { category: regex },
                { teaches: { $in: [regex] } },
                { wants: { $in: [regex] } }
            ];
        }

        // Category filter
        if (category && category !== "All" && category !== "All Skills") {
            filter.category = category;
        }

        // Location filter
        if (location && location !== "All Locations") {
            const locClean = location.split(",")[0].trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const locRegex = new RegExp(locClean, "i");
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [{ city: locRegex }, { location: locRegex }]
            });
        }

        // Mode filter
        if (mode && mode !== "All") {
            if (mode === "Both") {
                filter.mode = { $in: ["Online", "Offline", "Both"] };
            } else {
                filter.mode = { $in: [mode, "Both"] };
            }
        }

        const skip = (Number(page) - 1) * Number(limit);

        let users = await User.find(filter)
            .select("-password -resetPasswordToken -resetPasswordExpire")
            .skip(skip)
            .limit(Number(limit))
            .lean();

        // Calculate match scores
        const currentUser = req.user || null;
        users = users.map((u) => {
            const matchInfo = calculateMatchScore(currentUser, u);
            return {
                ...u,
                id: u._id,
                match: matchInfo.score,
                matchLabel: matchInfo.label,
                matchTier: matchInfo.tier,
                matchIcon: matchInfo.icon,
                matchExplanation: matchInfo.explanation
            };
        });

        // Sorting
        if (sort === "rating") {
            users.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sort === "completed") {
            users.sort((a, b) => (b.completed || 0) - (a.completed || 0));
        } else if (sort === "recent") {
            users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        } else if (sort === "name") {
            users.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        } else {
            // Default sort by smart match score
            users.sort((a, b) => (b.match || 0) - (a.match || 0));
        }

        const total = await User.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            page: Number(page),
            users
        });

    } catch (error) {
        console.error("GetUsers Error:", error);
        res.status(500).json({ success: false, message: "Error fetching users" });
    }
};

// GET RECOMMENDED USERS FOR DASHBOARD
const getRecommendedUsers = async (req, res) => {
    try {
        const currentUser = req.user;
        const users = await User.find({
            _id: { $ne: currentUser._id },
            status: "Active",
            role: "user"
        })
            .select("-password")
            .lean();

        const scoredUsers = users.map((u) => {
            const matchInfo = calculateMatchScore(currentUser, u);
            return {
                ...u,
                id: u._id,
                match: matchInfo.score,
                matchLabel: matchInfo.label,
                matchTier: matchInfo.tier,
                matchIcon: matchInfo.icon,
                matchExplanation: matchInfo.explanation
            };
        });

        scoredUsers.sort((a, b) => b.match - a.match);
        const top3 = scoredUsers.slice(0, 3);

        res.status(200).json({
            success: true,
            recommended: top3
        });
    } catch (error) {
        console.error("GetRecommended Error:", error);
        res.status(500).json({ success: false, message: "Error fetching recommendations" });
    }
};

// GET SINGLE USER PROFILE
const getUserProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select("-password").lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "User profile not found" });
        }

        const currentUser = req.user || null;
        const matchInfo = calculateMatchScore(currentUser, user);

        res.status(200).json({
            success: true,
            user: {
                ...user,
                id: user._id,
                match: matchInfo.score,
                matchLabel: matchInfo.label,
                matchTier: matchInfo.tier,
                matchIcon: matchInfo.icon,
                matchExplanation: matchInfo.explanation
            }
        });

    } catch (error) {
        console.error("GetUserProfile Error:", error);
        res.status(500).json({ success: false, message: "Error fetching user profile" });
    }
};

// UPDATE CURRENT USER PROFILE
const updateProfile = async (req, res) => {
    try {
        // Prevent administrator accounts from modifying their profiles through the regular member profile endpoint
        if (req.user && req.user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrator account profiles cannot be modified through the member profile portal."
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const {
            fullName,
            name,
            city,
            location,
            bio,
            photo,
            mode,
            availability,
            category,
            teaches,
            wants,
            socials
        } = req.body;

        // Full name / Name validation and updates
        if (fullName !== undefined) {
            if (typeof fullName !== "string") {
                return res.status(400).json({ success: false, message: "Full name must be a string" });
            }
            const trimmedFullName = fullName.trim();
            if (trimmedFullName.length < 2) {
                return res.status(400).json({ success: false, message: "Full name must be at least 2 characters long" });
            }
            if (trimmedFullName.length > 70) {
                return res.status(400).json({ success: false, message: "Full name cannot exceed 70 characters" });
            }
            user.fullName = trimmedFullName;
            user.name = name && typeof name === "string" && name.trim()
                ? name.trim().slice(0, 50)
                : (trimmedFullName.split(" ")[0] || user.name || "Member").slice(0, 50);
        } else if (name !== undefined) {
            if (typeof name !== "string") {
                return res.status(400).json({ success: false, message: "Name must be a string" });
            }
            const trimmedName = name.trim();
            if (trimmedName.length < 2) {
                return res.status(400).json({ success: false, message: "Name must be at least 2 characters long" });
            }
            user.name = trimmedName.slice(0, 50);
            if (!user.fullName) user.fullName = trimmedName;
        }

        // City & Location validation and updates
        if (city !== undefined) {
            const trimmedCity = String(city).trim().slice(0, 60);
            user.city = trimmedCity;
            user.location = location && typeof location === "string" && location.trim()
                ? location.trim().slice(0, 100)
                : (trimmedCity ? `${trimmedCity}, Kerala` : user.location || "Kerala, India");
        } else if (location !== undefined) {
            const trimmedLoc = String(location).trim().slice(0, 100);
            user.location = trimmedLoc;
            if (!user.city && trimmedLoc) {
                user.city = trimmedLoc.split(",")[0].trim().slice(0, 60);
            }
        }

        // Bio validation and updates (max 600 chars)
        if (bio !== undefined) {
            user.bio = String(bio).trim().slice(0, 600);
        }

        // Profile Photo validation (MIME check, size cap, URL/data-URI safety)
        if (photo !== undefined) {
            if (photo === null || photo === "") {
                user.photo = "";
            } else if (typeof photo === "string") {
                const trimmedPhoto = photo.trim();
                const lowerPhoto = trimmedPhoto.toLowerCase();

                // Prevent XSS / malicious URL schemes
                if (
                    lowerPhoto.startsWith("javascript:") ||
                    lowerPhoto.startsWith("vbscript:") ||
                    lowerPhoto.includes("<script")
                ) {
                    return res.status(400).json({ success: false, message: "Invalid image URL scheme" });
                }

                // If base64 data URI, validate MIME and size (max ~3.5MB data URI for 2.5MB payload)
                if (lowerPhoto.startsWith("data:")) {
                    const match = trimmedPhoto.match(/^data:image\/(jpeg|jpg|png|webp);base64,/i);
                    if (!match) {
                        return res.status(400).json({
                            success: false,
                            message: "Only JPG, PNG, and WebP image formats are supported"
                        });
                    }
                    if (trimmedPhoto.length > 3.5 * 1024 * 1024) {
                        return res.status(400).json({
                            success: false,
                            message: "Image payload exceeds maximum size limit (2MB)"
                        });
                    }
                } else if (
                    !lowerPhoto.startsWith("http://") &&
                    !lowerPhoto.startsWith("https://") &&
                    !lowerPhoto.startsWith("/")
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Image must be a valid HTTP/HTTPS URL or uploaded image"
                    });
                }

                user.photo = trimmedPhoto;
            }
        }

        // Learning Mode
        if (mode !== undefined) {
            const validModes = ["Online", "Offline", "Both"];
            user.mode = validModes.includes(mode) ? mode : "Both";
        }

        // Availability & Category
        if (availability !== undefined) {
            user.availability = String(availability).trim().slice(0, 100);
        }
        if (category !== undefined) {
            user.category = String(category).trim().slice(0, 50);
        }

        // Skills (teaches & wants) with case-insensitive deduplication
        if (teaches !== undefined) {
            user.teaches = dedupeSkills(teaches);
        }
        if (wants !== undefined) {
            user.wants = dedupeSkills(wants);
        }

        // Social profiles sanitization against script payloads
        if (socials && typeof socials === "object") {
            user.socials = {
                instagram: socials.instagram !== undefined ? sanitizeSocialValue(socials.instagram) : (user.socials?.instagram || ""),
                twitter: socials.twitter !== undefined ? sanitizeSocialValue(socials.twitter) : (user.socials?.twitter || ""),
                linkedin: socials.linkedin !== undefined ? sanitizeSocialValue(socials.linkedin) : (user.socials?.linkedin || ""),
                github: socials.github !== undefined ? sanitizeSocialValue(socials.github) : (user.socials?.github || "")
            };
        }

        await user.save();

        // Generate profile updated notification for authenticated user
        // Deduplication strategy:
        // 1. In-memory burst lock prevents concurrent requests from creating duplicate notifications
        // 2. Unread notification check prevents spam if user makes rapid duplicate saves
        // 3. If previous notification was read (read: true), a legitimate new update immediately creates a fresh notification
        try {
            const userIdStr = user._id.toString();
            const now = Date.now();
            const lastProcessed = activeProfileNotifLocks.get(userIdStr) || 0;

            if (now - lastProcessed > 2000) {
                activeProfileNotifLocks.set(userIdStr, now);
                setTimeout(() => {
                    if (activeProfileNotifLocks.get(userIdStr) === now) {
                        activeProfileNotifLocks.delete(userIdStr);
                    }
                }, 5000);

                // Check if an unread recent notification already exists (within 10s)
                const unreadRecent = await Notification.findOne({
                    recipient: user._id,
                    type: "profile_updated",
                    read: false,
                    createdAt: { $gte: new Date(now - 10 * 1000) }
                });

                if (!unreadRecent) {
                    await Notification.create({
                        recipient: user._id,
                        type: "profile_updated",
                        title: "Profile Updated Successfully",
                        text: "Your profile information has been successfully updated.",
                        link: "/my-profile",
                        read: false
                    });
                }
            }
        } catch (notifErr) {
            console.error("Profile update notification error:", notifErr);
        }

        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: user._id,
                _id: user._id,
                name: user.name,
                fullName: user.fullName,
                email: user.email,
                city: user.city,
                location: user.location,
                photo: user.photo,
                bio: user.bio,
                mode: user.mode,
                availability: user.availability,
                category: user.category,
                teaches: user.teaches,
                wants: user.wants,
                rating: user.rating,
                completed: user.completed,
                role: user.role,
                status: user.status,
                socials: user.socials,
                savedProfiles: user.savedProfiles
            }
        });

    } catch (error) {
        console.error("UpdateProfile Error:", error);
        res.status(500).json({ success: false, message: "Error updating profile" });
    }
};

// CHANGE PASSWORD
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Please provide both current and new password"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters"
            });
        }

        const user = await User.findById(req.user._id).select("+password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect current password."
            });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("ChangePassword Error:", error);
        res.status(500).json({ success: false, message: "Error changing password" });
    }
};

// DELETE OWN ACCOUNT (SELF-SERVICE CLEANUP)
const deleteAccount = async (req, res) => {
    let session = null;
    try {
        const userId = req.user._id;

        // Attempt transaction for multi-document ACID consistency
        try {
            session = await mongoose.startSession();
            session.startTransaction();
        } catch {
            session = null;
        }

        const sessionOpt = session ? { session } : {};

        // 1. Remove skill listings belonging to the deleted member
        await SkillListing.deleteMany(
            { $or: [{ user: userId }, { userId: userId }] },
            sessionOpt
        );

        // 2. Remove user ID from all other members' savedProfiles arrays
        await User.updateMany(
            { savedProfiles: userId },
            { $pull: { savedProfiles: userId } },
            sessionOpt
        );

        // 3. Remove conversations involving the deleted member
        await Conversation.deleteMany(
            { participants: userId },
            sessionOpt
        );

        // 4. Cancel active or pending exchanges (completed exchanges preserved for audit history)
        await Exchange.updateMany(
            {
                $or: [{ requester: userId }, { partner: userId }],
                status: { $in: ["pending", "active"] }
            },
            {
                $set: {
                    status: "cancelled",
                    "agreement.status": "cancelled"
                }
            },
            sessionOpt
        );

        // 5. Clean up sessions involving the deleted member
        await Session.deleteMany(
            { $or: [{ user: userId }, { partner: userId }, { createdBy: userId }] },
            sessionOpt
        );

        // 6. Clean up notifications sent to or from the deleted member
        await Notification.deleteMany(
            { $or: [{ recipient: userId }, { sender: userId }] },
            sessionOpt
        );

        // 7. Delete User document
        await User.findByIdAndDelete(userId, sessionOpt);

        if (session) {
            await session.commitTransaction();
            session.endSession();
        }

        res.status(200).json({
            success: true,
            message: "Account and all associated active records deleted successfully"
        });
    } catch (error) {
        if (session) {
            try {
                await session.abortTransaction();
                session.endSession();
            } catch {
                // Ignore abort errors
            }
        }
        console.error("DeleteAccount Error:", error);
        res.status(500).json({ success: false, message: "Error deleting account" });
    }
};

// GET SAVED PROFILES
const getSavedProfiles = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const rawSavedIds = [...(user.savedProfiles || [])];

        await user.populate({
            path: "savedProfiles",
            select: "-password -resetPasswordToken -resetPasswordExpire"
        });

        // Filter out null / deleted accounts and disabled / admin accounts
        const validProfiles = (user.savedProfiles || []).filter(
            (u) => u && u.status === "Active" && u.role === "user"
        );

        // If any corrupted/deleted/disabled references exist, clean up savedProfiles array in background
        const validIds = validProfiles.map((u) => u._id);
        if (validIds.length !== rawSavedIds.length) {
            user.savedProfiles = validIds;
            await User.findByIdAndUpdate(req.user._id, { savedProfiles: validIds });
        }

        const savedUsers = validProfiles.map((u) => {
            const uObj = u.toObject ? u.toObject() : u;
            const matchInfo = calculateMatchScore(user, uObj);
            return {
                ...uObj,
                id: u._id,
                match: matchInfo.score,
                matchScore: matchInfo,
                matchLabel: matchInfo.label,
                matchTier: matchInfo.tier,
                matchIcon: matchInfo.icon,
                matchExplanation: matchInfo.explanation
            };
        });

        res.status(200).json({
            success: true,
            count: savedUsers.length,
            savedIds: validIds,
            savedUsers
        });

    } catch (error) {
        console.error("GetSavedProfiles Error:", error);
        res.status(500).json({ success: false, message: "Error fetching saved profiles" });
    }
};

// SAVE OR UNSAVE A PROFILE (TOGGLE BOOKMARK)
const saveProfile = async (req, res) => {
    try {
        const targetId = req.params.id;

        // 1. Validate ObjectId format
        if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID format."
            });
        }

        // 2. Prevent saving own profile
        if (targetId.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot save your own profile."
            });
        }

        // 3. Find target user
        const targetUser = await User.findById(targetId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // 4. Do not allow saving admin accounts
        if (targetUser.role === "admin") {
            return res.status(400).json({
                success: false,
                message: "Administrator profiles cannot be saved."
            });
        }

        // 5. Do not allow saving disabled accounts
        if (targetUser.status === "Disabled") {
            return res.status(400).json({
                success: false,
                message: "Inactive or disabled accounts cannot be saved."
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "Current user not found." });
        }

        if (!Array.isArray(user.savedProfiles)) {
            user.savedProfiles = [];
        }

        const isSaved = user.savedProfiles.some((id) => id && id.toString() === targetId.toString());

        if (isSaved) {
            // Remove / Unsave
            user.savedProfiles = user.savedProfiles.filter((id) => id && id.toString() !== targetId.toString());
            await user.save();
            return res.status(200).json({
                success: true,
                message: "Profile removed from saved list",
                saved: false,
                targetId,
                savedIds: user.savedProfiles
            });
        } else {
            // Add / Save
            user.savedProfiles.push(targetUser._id);
            await user.save();
            return res.status(200).json({
                success: true,
                message: "Profile saved successfully",
                saved: true,
                targetId,
                savedIds: user.savedProfiles
            });
        }

    } catch (error) {
        console.error("SaveProfile Error:", error);
        res.status(500).json({ success: false, message: "Error updating saved status" });
    }
};

module.exports = {
    getUsers,
    getRecommendedUsers,
    getUserProfile,
    updateProfile,
    changePassword,
    deleteAccount,
    getSavedProfiles,
    saveProfile
};

