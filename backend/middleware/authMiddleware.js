const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    try {
        let token;

        // Check whether the request contains a Bearer token
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized. No token provided."
            });
        }

        // Verify the token
        const secret = process.env.JWT_SECRET;
        if (!secret || !secret.trim()) {
            return res.status(500).json({
                success: false,
                message: "Server authentication configuration error: JWT_SECRET is not configured."
            });
        }
        const decoded = jwt.verify(token, secret.trim());

        // Find the user associated with the token
        const user = await User.findById(decoded.id);

        if (!user || user.status !== "Active") {
            return res.status(401).json({
                success: false,
                message: "User not found or account is disabled."
            });
        }

        // Attach user information to the request
        req.user = user;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token."
        });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: "Access denied: Administrator privileges required."
        });
    }
};

module.exports = { protect, adminOnly };