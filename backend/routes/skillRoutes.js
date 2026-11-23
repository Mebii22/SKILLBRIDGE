const express = require("express");
const router = express.Router();

const {
    getSkills,
    createSkillListing,
    updateSkillListing,
    deleteSkillListing
} = require("../controllers/skillController");

const { protect } = require("../middleware/authMiddleware");

router.get("/", getSkills);
router.post("/", protect, createSkillListing);
router.put("/:id", protect, updateSkillListing);
router.delete("/:id", protect, deleteSkillListing);

module.exports = router;

