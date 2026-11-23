const express = require("express");
const router = express.Router();

const {
    getUsers,
    getRecommendedUsers,
    getUserProfile,
    updateProfile,
    changePassword,
    deleteAccount,
    getSavedProfiles,
    saveProfile
} = require("../controllers/userController");

const { protect } = require("../middleware/authMiddleware");

// Public / Semi-protected routes
router.get("/", (req, res, next) => {
    // Optional auth token checking so authenticated user is excluded from discover list
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        return protect(req, res, next);
    }
    next();
}, getUsers);

router.get("/recommended", protect, getRecommendedUsers);
router.get("/saved", protect, getSavedProfiles);
router.get("/saved/all", protect, getSavedProfiles);
router.post("/saved/:id", protect, saveProfile);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);
router.delete("/profile", protect, deleteAccount);
router.delete("/account", protect, deleteAccount);

// Get single user by id (keep parameterized route at the bottom)
router.get("/:id", (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        return protect(req, res, next);
    }
    next();
}, getUserProfile);

module.exports = router;

