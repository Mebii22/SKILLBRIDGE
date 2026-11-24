const express = require("express");
const router = express.Router();

const {
    getSkills,
    getMySkills,
    getSkillById,
    createSkillListing,
    updateSkillListing,
    deleteSkillListing
} = require("../controllers/skillController");

const { protect } = require("../middleware/authMiddleware");

// Public / Semi-protected routes (extracts user if token present)
router.get("/", (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        return protect(req, res, next);
    }
    next();
}, getSkills);

// Authenticated current user listings (must be above /:id)
router.get("/my", protect, getMySkills);
router.get("/my-listings", protect, getMySkills);

// Single listing details
router.get("/:id", getSkillById);

// Listing operations
router.post("/", protect, createSkillListing);
router.put("/:id", protect, updateSkillListing);
router.delete("/:id", protect, deleteSkillListing);

module.exports = router;
