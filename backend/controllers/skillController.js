const mongoose = require("mongoose");
const SkillListing = require("../models/SkillListing");
const User = require("../models/User");

// Helper to escape regex special characters
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET ALL SKILLS (PUBLIC / DISCOVER VIEW WITH OPTIONAL FILTERS)
const getSkills = async (req, res) => {
    try {
        const { category, mode, level, location, q } = req.query;
        const filter = { status: "approved" };

        // Exclude current authenticated user's own listings from recommendations
        if (req.user && req.user._id) {
            filter.user = { $ne: req.user._id };
        }

        if (category && category !== "All" && category !== "All Skills") {
            filter.category = category;
        }
        if (mode && mode !== "All") {
            filter.mode = { $in: [mode, "Both"] };
        }
        if (level && level !== "All" && level !== "All Levels") {
            const safeLevel = escapeRegex(level.split(" ")[0]);
            filter.level = new RegExp(safeLevel, "i");
        }
        if (location && location !== "All Locations") {
            const locClean = escapeRegex(location.split(",")[0].trim());
            filter.location = new RegExp(locClean, "i");
        }
        if (q && q.trim()) {
            const regex = new RegExp(escapeRegex(q.trim()), "i");
            filter.$or = [
                { skill: regex },
                { title: regex },
                { category: regex },
                { description: regex },
                { userName: regex }
            ];
        }

        const listings = await SkillListing.find(filter)
            .populate("user", "name fullName photo rating completed city location mode status role")
            .sort({ createdAt: -1 })
            .lean();

        // Security filter: exclude listings from disabled or admin users
        const activeListings = listings.filter((l) => {
            if (!l.user) return false;
            if (l.user.status === "Disabled" || l.user.role === "admin") return false;
            return true;
        });

        res.status(200).json({
            success: true,
            count: activeListings.length,
            skills: activeListings.map((l) => ({
                ...l,
                id: l._id,
                publisher: l.user
            }))
        });
    } catch (error) {
        console.error("GetSkills Error:", error);
        res.status(500).json({ success: false, message: "Error fetching skills" });
    }
};

// GET AUTHENTICATED USER'S OWN LISTINGS
const getMySkills = async (req, res) => {
    try {
        const userId = req.user._id;
        const listings = await SkillListing.find({ user: userId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: listings.length,
            skills: listings.map((l) => ({ ...l.toObject(), id: l._id }))
        });
    } catch (error) {
        console.error("GetMySkills Error:", error);
        res.status(500).json({ success: false, message: "Error fetching your skill listings" });
    }
};

// GET SINGLE SKILL LISTING BY ID
const getSkillById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid skill listing ID format" });
        }
        const listing = await SkillListing.findById(id);

        if (!listing) {
            return res.status(404).json({ success: false, message: "Skill listing not found" });
        }

        res.status(200).json({
            success: true,
            skill: { ...listing.toObject(), id: listing._id }
        });
    } catch (error) {
        console.error("GetSkillById Error:", error);
        res.status(500).json({ success: false, message: "Error fetching skill listing" });
    }
};

// CREATE SKILL LISTING (SHARE A SKILL)
const createSkillListing = async (req, res) => {
    try {
        const {
            title,
            skill,
            teachSkill,
            category,
            teachCategory,
            description,
            level,
            teachLevel,
            mode,
            availability,
            location,
            city,
            experience,
            wantSkill
        } = req.body;

        const skillName = (title || skill || teachSkill || "").trim();
        if (!skillName || skillName.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Skill title is required (minimum 2 characters)"
            });
        }
        if (skillName.length > 70) {
            return res.status(400).json({
                success: false,
                message: "Skill title cannot exceed 70 characters"
            });
        }

        const chosenCategory = (category || teachCategory || "Technology").trim();
        if (!chosenCategory) {
            return res.status(400).json({
                success: false,
                message: "Skill category is required"
            });
        }

        const trimmedDescription = (description || "").trim();
        if (!trimmedDescription || trimmedDescription.length < 10) {
            return res.status(400).json({
                success: false,
                message: "A detailed description is required (minimum 10 characters)"
            });
        }
        if (trimmedDescription.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Description cannot exceed 1000 characters"
            });
        }

        const validModes = ["Online", "Offline", "Both"];
        const chosenMode = validModes.includes(mode) ? mode : "Both";

        const validLevels = ["Beginner", "Beginner Friendly", "Intermediate", "Advanced", "Advanced / Expert"];
        const chosenLevel = validLevels.includes(level || teachLevel) ? (level || teachLevel) : "Intermediate";

        const trimmedAvailability = (availability || "").trim();
        if (!trimmedAvailability || trimmedAvailability.length < 2) {
            return res.status(400).json({
                success: false,
                message: "Availability is required (e.g. Weekends 10 AM – 2 PM)"
            });
        }

        const trimmedLocation = (location || city || "").trim();
        if ((chosenMode === "Offline" || chosenMode === "Both") && !trimmedLocation) {
            return res.status(400).json({
                success: false,
                message: "Location is required for offline / hybrid skill exchanges"
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Prevent duplicate listing of the same skill by this user (case-insensitive)
        const existing = await SkillListing.findOne({
            user: user._id,
            skill: new RegExp(`^${escapeRegex(skillName)}$`, "i")
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: `You have already published a listing for "${skillName}".`
            });
        }

        // Create skill listing
        const listing = await SkillListing.create({
            user: user._id,
            userName: user.fullName || user.name,
            userPhoto: user.photo || "",
            title: skillName,
            skill: skillName,
            category: chosenCategory,
            description: trimmedDescription,
            level: chosenLevel,
            mode: chosenMode,
            availability: trimmedAvailability,
            location: trimmedLocation || user.city || user.location || "Kerala, India",
            experience: (experience || "").trim().slice(0, 300),
            status: "approved"
        });

        // Sync with User profile: add to user.teaches if not already present
        const teachesExists = (user.teaches || []).some(
            (t) => t.toLowerCase() === skillName.toLowerCase()
        );
        if (!teachesExists) {
            if (!Array.isArray(user.teaches)) user.teaches = [];
            user.teaches.unshift(skillName);
        }

        if (wantSkill && wantSkill.trim()) {
            const wantsExists = (user.wants || []).some(
                (w) => w.toLowerCase() === wantSkill.trim().toLowerCase()
            );
            if (!wantsExists) {
                if (!Array.isArray(user.wants)) user.wants = [];
                user.wants.unshift(wantSkill.trim());
            }
        }

        if (trimmedLocation && !user.city) {
            user.city = trimmedLocation.split(",")[0].trim();
        }

        await user.save();

        res.status(201).json({
            success: true,
            message: "Skill listing published successfully",
            skill: { ...listing.toObject(), id: listing._id }
        });
    } catch (error) {
        console.error("CreateSkill Error:", error);
        res.status(500).json({ success: false, message: "Error creating skill listing" });
    }
};

// UPDATE SKILL LISTING
const updateSkillListing = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await SkillListing.findById(id);

        if (!listing) {
            return res.status(404).json({ success: false, message: "Skill listing not found" });
        }

        // Strict ownership check
        if (listing.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Not authorized to update this listing"
            });
        }

        const {
            title,
            skill,
            category,
            description,
            level,
            mode,
            availability,
            location,
            experience
        } = req.body;

        const oldSkillName = listing.skill || listing.title;
        let newSkillName = (title || skill || "").trim();

        if (newSkillName) {
            if (newSkillName.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: "Skill title must be at least 2 characters"
                });
            }
            if (newSkillName.length > 70) {
                return res.status(400).json({
                    success: false,
                    message: "Skill title cannot exceed 70 characters"
                });
            }

            // Check if renaming causes duplicate with user's other listings
            if (newSkillName.toLowerCase() !== oldSkillName.toLowerCase()) {
                const duplicate = await SkillListing.findOne({
                    user: listing.user,
                    _id: { $ne: listing._id },
                    skill: new RegExp(`^${escapeRegex(newSkillName)}$`, "i")
                });
                if (duplicate) {
                    return res.status(400).json({
                        success: false,
                        message: `You already have another listing for "${newSkillName}".`
                    });
                }
            }

            listing.skill = newSkillName;
            listing.title = newSkillName;
        }

        if (category !== undefined) {
            const trimmedCat = String(category).trim();
            if (!trimmedCat) {
                return res.status(400).json({ success: false, message: "Category cannot be empty" });
            }
            listing.category = trimmedCat;
        }

        if (description !== undefined) {
            const trimmedDesc = String(description).trim();
            if (trimmedDesc.length < 10) {
                return res.status(400).json({
                    success: false,
                    message: "Description must be at least 10 characters"
                });
            }
            if (trimmedDesc.length > 1000) {
                return res.status(400).json({
                    success: false,
                    message: "Description cannot exceed 1000 characters"
                });
            }
            listing.description = trimmedDesc;
        }

        if (level !== undefined) {
            const validLevels = ["Beginner", "Beginner Friendly", "Intermediate", "Advanced", "Advanced / Expert"];
            if (validLevels.includes(level)) listing.level = level;
        }

        if (mode !== undefined) {
            const validModes = ["Online", "Offline", "Both"];
            if (validModes.includes(mode)) listing.mode = mode;
        }

        if (availability !== undefined) {
            const trimmedAvail = String(availability).trim();
            if (trimmedAvail.length < 2) {
                return res.status(400).json({
                    success: false,
                    message: "Availability must be at least 2 characters"
                });
            }
            listing.availability = trimmedAvail;
        }

        if (location !== undefined) {
            listing.location = String(location).trim().slice(0, 100);
        }

        if (experience !== undefined) {
            listing.experience = String(experience).trim().slice(0, 300);
        }

        await listing.save();

        // If skill name changed, update corresponding skill in user's profile teaches array
        if (newSkillName && newSkillName.toLowerCase() !== oldSkillName.toLowerCase()) {
            const user = await User.findById(listing.user);
            if (user && Array.isArray(user.teaches)) {
                user.teaches = user.teaches.map((s) =>
                    s.toLowerCase() === oldSkillName.toLowerCase() ? newSkillName : s
                );
                // If newSkillName was not in teaches, add it
                if (!user.teaches.some((s) => s.toLowerCase() === newSkillName.toLowerCase())) {
                    user.teaches.unshift(newSkillName);
                }
                await user.save();
            }
        }

        res.status(200).json({
            success: true,
            message: "Skill listing updated successfully",
            skill: { ...listing.toObject(), id: listing._id }
        });
    } catch (error) {
        console.error("UpdateSkill Error:", error);
        res.status(500).json({ success: false, message: "Error updating skill listing" });
    }
};

// DELETE SKILL LISTING
const deleteSkillListing = async (req, res) => {
    try {
        const { id } = req.params;
        const listing = await SkillListing.findById(id);

        if (!listing) {
            return res.status(404).json({ success: false, message: "Skill listing not found" });
        }

        // Strict ownership check
        if (listing.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Not authorized to delete this listing"
            });
        }

        const skillNameToDelete = listing.skill || listing.title;
        const ownerId = listing.user;

        await SkillListing.findByIdAndDelete(id);

        // Check if user has any remaining listing with this skill name
        const remaining = await SkillListing.countDocuments({
            user: ownerId,
            skill: new RegExp(`^${escapeRegex(skillNameToDelete)}$`, "i")
        });

        // If no remaining listing for this specific skill, remove only this skill from user.teaches
        // All unrelated profile skills remain completely untouched
        if (remaining === 0) {
            const user = await User.findById(ownerId);
            if (user && Array.isArray(user.teaches)) {
                user.teaches = user.teaches.filter(
                    (s) => s.toLowerCase() !== skillNameToDelete.toLowerCase()
                );
                await user.save();
            }
        }

        res.status(200).json({
            success: true,
            message: "Skill listing deleted successfully",
            deletedId: id
        });
    } catch (error) {
        console.error("DeleteSkill Error:", error);
        res.status(500).json({ success: false, message: "Error deleting skill listing" });
    }
};

module.exports = {
    getSkills,
    getMySkills,
    getSkillById,
    createSkillListing,
    updateSkillListing,
    deleteSkillListing
};
