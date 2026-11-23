const SkillListing = require("../models/SkillListing");
const User = require("../models/User");

// GET ALL SKILLS (WITH OPTIONAL FILTERING)
const getSkills = async (req, res) => {
    try {
        const { category, mode, level, q } = req.query;
        const filter = { status: "approved" };

        if (category && category !== "All") filter.category = category;
        if (mode && mode !== "All") filter.mode = { $in: [mode, "Both"] };
        if (level && level !== "All") filter.level = level;
        if (q && q.trim()) {
            filter.skill = new RegExp(q.trim(), "i");
        }

        const listings = await SkillListing.find(filter).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: listings.length,
            skills: listings.map((l) => ({ ...l.toObject(), id: l._id }))
        });
    } catch (error) {
        console.error("GetSkills Error:", error);
        res.status(500).json({ success: false, message: "Error fetching skills" });
    }
};

// CREATE SKILL LISTING (SHARE A SKILL)
const createSkillListing = async (req, res) => {
    try {
        const {
            skill,
            category,
            level,
            mode,
            teachSkill,
            teachCategory,
            teachLevel,
            wantSkill,
            city,
            availability,
            bio
        } = req.body;

        const skillName = (skill || teachSkill || "").trim();
        if (!skillName) {
            return res.status(400).json({
                success: false,
                message: "Skill name is required"
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Prevent duplicate listing of the same skill by this user
        const existing = await SkillListing.findOne({
            user: user._id,
            skill: new RegExp(`^${skillName}$`, "i")
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: "You have already listed this skill."
            });
        }

        // Create skill listing (automatically approved for community sharing)
        const listing = await SkillListing.create({
            user: user._id,
            userName: user.fullName || user.name,
            userPhoto: user.photo,
            skill: skillName,
            category: category || teachCategory || user.category || "Technology",
            mode: mode || user.mode || "Both",
            level: level || teachLevel || "Intermediate",
            status: "approved"
        });

        // Update user's teaches, wants, city, bio, availability if provided
        if (skillName && !user.teaches.includes(skillName)) {
            user.teaches.unshift(skillName);
        }
        if (wantSkill && !user.wants.includes(wantSkill.trim())) {
            user.wants.unshift(wantSkill.trim());
        }
        if (city) user.city = city.trim();
        if (availability) user.availability = availability.trim();
        if (bio) user.bio = bio.trim();

        await user.save();

        res.status(201).json({
            success: true,
            message: "Skill listing published successfully",
            skill: { ...listing.toObject(), id: listing._id },
            updatedUser: user
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

        // Ownership or Admin check
        if (listing.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Not authorized to update this listing" });
        }

        const { skill, category, level, mode } = req.body;
        if (skill && skill.trim()) listing.skill = skill.trim();
        if (category) listing.category = category;
        if (level) listing.level = level;
        if (mode) listing.mode = mode;

        await listing.save();

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

        if (listing.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "Not authorized to delete this listing" });
        }

        await SkillListing.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Skill listing deleted successfully"
        });
    } catch (error) {
        console.error("DeleteSkill Error:", error);
        res.status(500).json({ success: false, message: "Error deleting skill listing" });
    }
};

module.exports = {
    getSkills,
    createSkillListing,
    updateSkillListing,
    deleteSkillListing
};

