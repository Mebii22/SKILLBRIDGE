const User = require("../models/User");
const Notification = require("../models/Notification");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT Token
const generateToken = (id, role) => {
    const secret = process.env.JWT_SECRET;
    if (!secret || !secret.trim()) {
        throw new Error("Server authentication configuration error: JWT_SECRET is not configured.");
    }
    return jwt.sign(
        { id, role },
        secret.trim(),
        { expiresIn: "7d" }
    );
};

// USER REGISTRATION
const registerUser = async (req, res) => {
    try {
        const {
            name,
            fullName,
            email,
            password,
            city,
            bio,
            mode,
            photo,
            teaches,
            wants
        } = req.body;

        // Validate required fields
        if (!fullName || !email || !password || !city) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields (Full Name, Email, Password, City)"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters"
            });
        }

        const normalizedEmail = String(email).toLowerCase().trim();

        // Validate email format (RFC 5322 dot-atom: disallows leading/trailing/consecutive dots)
        const emailRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 254) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        // Check existing user
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        const firstName = name || fullName.trim().split(" ")[0];
        const defaultAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";

        // Validate and sanitize skills
        const cleanTeaches = Array.isArray(teaches)
            ? teaches.map((s) => String(s).trim()).filter(Boolean)
            : (typeof teaches === "string" ? teaches.split(",").map((s) => s.trim()).filter(Boolean) : []);

        const cleanWants = Array.isArray(wants)
            ? wants.map((s) => String(s).trim()).filter(Boolean)
            : (typeof wants === "string" ? wants.split(",").map((s) => s.trim()).filter(Boolean) : []);

        if (cleanTeaches.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one skill you can teach"
            });
        }

        if (cleanWants.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one skill you want to learn"
            });
        }

        // Create user
        const user = await User.create({
            name: firstName,
            fullName: fullName.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            city: city.trim(),
            location: `${city.trim()}, Kerala`,
            bio: bio ? bio.trim() : "",
            mode: mode || "Both",
            photo: photo || defaultAvatar,
            teaches: cleanTeaches,
            wants: cleanWants,
            role: "user",
            status: "Active"
        });

        // Create welcome notification
        try {
            await Notification.create({
                recipient: user._id,
                type: "session",
                title: "Welcome to SkillBridge!",
                text: `Welcome ${user.name}! Your account is active. Explore matches and start your skill exchange!`
            });
        } catch (notifErr) {
            console.error("Welcome notification error:", notifErr);
        }

        // Generate token
        const token = generateToken(user._id, user.role);

        res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
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
        console.error("Registration Error:", error);
        res.status(500).json({
            success: false,
            message: "Registration failed: " + error.message
        });
    }
};

// USER LOGIN
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Find user and explicitly include password
        const user = await User.findOne({ email: normalizedEmail }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Compare password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Check account status
        if (user.status === "Disabled") {
            return res.status(403).json({
                success: false,
                message: "Your account has been disabled by an administrator. Please contact support."
            });
        }

        // Enforce user-only role for regular login (reject admin accounts)
        if (user.role === "admin") {
            return res.status(403).json({
                success: false,
                message: "Admin accounts must sign in through the Admin Portal."
            });
        }

        if (user.role !== "user") {
            return res.status(403).json({
                success: false,
                message: "Access denied: Unauthorized role."
            });
        }

        // Generate token
        const token = generateToken(user._id, user.role);

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
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
        console.error("Login Error:", error);
        res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
};

// ADMIN LOGIN
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Admin email and password are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail }).select("+password");

        if (!user || user.role !== "admin") {
            return res.status(401).json({
                success: false,
                message: "Invalid admin credentials."
            });
        }

        if (user.status === "Disabled") {
            return res.status(403).json({
                success: false,
                message: "This admin account has been disabled."
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin credentials."
            });
        }

        const token = generateToken(user._id, user.role);

        res.status(200).json({
            success: true,
            message: "Admin login successful",
            token,
            admin: {
                id: user._id,
                name: user.name,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Admin Login Error:", error);
        res.status(500).json({
            success: false,
            message: "Admin login failed"
        });
    }
};

// GET CURRENT AUTHENTICATED USER
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({
            success: true,
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
        console.error("GetMe Error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = {
    registerUser,
    loginUser,
    adminLogin,
    getMe
};
