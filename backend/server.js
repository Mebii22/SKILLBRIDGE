const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const path = require("path");
dotenv.config();
if (!process.env.MONGO_URI) {
    dotenv.config({ path: path.join(__dirname, ".env") });
}

const connectDB = require("./config/db");
const { seedDatabase } = require("./utils/seedData");

// Route handlers
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const skillRoutes = require("./routes/skillRoutes");
const exchangeRoutes = require("./routes/exchangeRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Allowed Origins (Local Vite dev + Production Vercel deploy + optional CLIENT_URL / ALLOWED_ORIGINS)
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://skillbridge-six-olive.vercel.app"
];

// Append origins from environment configuration
if (process.env.CLIENT_URL) {
    process.env.CLIENT_URL.split(",").forEach((url) => {
        const customOrigin = url.trim().replace(/\/$/, "");
        if (customOrigin && !allowedOrigins.includes(customOrigin)) {
            allowedOrigins.push(customOrigin);
        }
    });
}

if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(",").forEach((url) => {
        const customOrigin = url.trim().replace(/\/$/, "");
        if (customOrigin && !allowedOrigins.includes(customOrigin)) {
            allowedOrigins.push(customOrigin);
        }
    });
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, postman, server-to-server)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Reject unapproved browser origins
        const corsError = new Error(`Not allowed by CORS: Origin ${origin} is not permitted.`);
        corsError.status = 403;
        return callback(corsError);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Body Parser with Base64 Image support
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Health Check Endpoints
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Welcome to SKILLBRIDGE REST API — Peer-to-Peer Skill Exchange Platform",
        uptime: process.uptime(),
        timestamp: new Date()
    });
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", uptime: process.uptime() });
});

app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "OK", uptime: process.uptime() });
});

// Mount API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/exchanges", exchangeRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

// Global 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `API Route Not Found: ${req.method} ${req.originalUrl}`
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    if (err.message && err.message.startsWith("Not allowed by CORS")) {
        return res.status(403).json({
            success: false,
            message: err.message
        });
    }

    console.error("Server Error:", err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

// Start server after database connection
const startServer = async () => {
    try {
        await connectDB();
        await seedDatabase();

        const PORT = process.env.PORT || 5001;

        app.listen(PORT, () => {
            console.log(`SKILLBRIDGE Backend running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
