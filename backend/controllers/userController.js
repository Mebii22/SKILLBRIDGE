const User = require("../models/User");
const Exchange = require("../models/Exchange");
const Session = require("../models/Session");
const Notification = require("../models/Notification");
const bcrypt = require("bcryptjs");
const { calculateMatchScore } = require("../utils/matching");

// In-memory concurrency guard for profile notifications
const activeProfileNotifLocks = new Map();

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

        // Query text search
        if (q && q.trim()) {
            const regex = new RegExp(q.trim(), "i");
            filter.$or = [
                { name: regex },
                { fullName: regex },
                { city: regex },
                { location: regex },
                { teaches: { $in: [regex] } },
                { wants: { $in: [regex] } }
            ];
        }

        // Category filter
        if (category && category !== "All") {
            filter.category = category;
        }

        // Location filter
        if (location && location !== "All Locations") {
            filter.$or = filter.$or || [];
            const locRegex = new RegExp(location.split(",")[0].trim(), "i");
            filter.city = locRegex;
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
            .select("-password")
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

        if (fullName) {
            user.fullName = fullName.trim();
            user.name = name || fullName.trim().split(" ")[0];
        }
        if (city) {
            user.city = city.trim();
            user.location = location ? location.trim() : `${city.trim()}, Kerala`;
        }
        if (bio !== undefined) user.bio = bio.trim();
        if (photo !== undefined) user.photo = photo;
        if (mode) user.mode = mode;
        if (availability) user.availability = availability.trim();
        if (category) user.category = category;

        if (Array.isArray(teaches)) {
            const cleaned = teaches.map((s) => String(s).trim()).filter(Boolean);
            user.teaches = cleaned;
        } else if (typeof teaches === "string") {
            const cleaned = teaches.split(",").map((s) => s.trim()).filter(Boolean);
            user.teaches = cleaned;
        }

        if (Array.isArray(wants)) {
            const cleaned = wants.map((s) => String(s).trim()).filter(Boolean);
            user.wants = cleaned;
        } else if (typeof wants === "string") {
            const cleaned = wants.split(",").map((s) => s.trim()).filter(Boolean);
            user.wants = cleaned;
        }

        if (socials && typeof socials === "object") {
            user.socials = {
                instagram: socials.instagram !== undefined ? socials.instagram.trim() : user.socials.instagram,
                twitter: socials.twitter !== undefined ? socials.twitter.trim() : user.socials.twitter,
                linkedin: socials.linkedin !== undefined ? socials.linkedin.trim() : user.socials.linkedin,
                github: socials.github !== undefined ? socials.github.trim() : user.socials.github,
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

// DELETE OWN ACCOUNT
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        await User.findByIdAndDelete(userId);

        // Clean up or cancel active exchanges
        await Exchange.updateMany(
            { $or: [{ requester: userId }, { partner: userId }], status: { $in: ["pending", "active"] } },
            { $set: { status: "cancelled", "agreement.status": "cancelled" } }
        );

        // Clean up user sessions and notifications
        await Session.deleteMany({ $or: [{ user: userId }, { partner: userId }] });
        await Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] });

        res.status(200).json({
            success: true,
            message: "Account deleted successfully"
        });
    } catch (error) {
        console.error("DeleteAccount Error:", error);
        res.status(500).json({ success: false, message: "Error deleting account" });
    }
};

// GET SAVED PROFILES
const getSavedProfiles = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: "savedProfiles",
            select: "-password"
        });

        const savedUsers = (user.savedProfiles || []).map((u) => ({
            ...u.toObject(),
            id: u._id
        }));

        res.status(200).json({
            success: true,
            savedIds: user.savedProfiles.map((u) => u._id),
            savedUsers
        });

    } catch (error) {
        console.error("GetSavedProfiles Error:", error);
        res.status(500).json({ success: false, message: "Error fetching saved profiles" });
    }
};

// SAVE A PROFILE
const saveProfile = async (req, res) => {
    try {
        const targetId = req.params.id;

        if (targetId.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot save your own profile."
            });
        }

        const targetUser = await User.findById(targetId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const user = await User.findById(req.user._id);
        const isSaved = user.savedProfiles.some((id) => id.toString() === targetId.toString());

        if (isSaved) {
            // Remove
            user.savedProfiles = user.savedProfiles.filter((id) => id.toString() !== targetId.toString());
            await user.save();
            return res.status(200).json({
                success: true,
                message: "Profile removed from saved list",
                saved: false,
                savedIds: user.savedProfiles
            });
        } else {
            // Add
            user.savedProfiles.push(targetId);
            await user.save();
            return res.status(200).json({
                success: true,
                message: "Profile saved successfully",
                saved: true,
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

