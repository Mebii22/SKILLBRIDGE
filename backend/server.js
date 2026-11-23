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

// Allowed Origins (Local Vite dev + Production Vercel deploy + optional CLIENT_URL)
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://skillbridge-six-olive.vercel.app"
];

if (process.env.CLIENT_URL) {
    const customOrigin = process.env.CLIENT_URL.trim().replace(/\/$/, "");
    if (!allowedOrigins.includes(customOrigin)) {
        allowedOrigins.push(customOrigin);
    }
}

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith(".vercel.app")) {
            callback(null, true);
        } else {
            callback(null, true); // Permissive in dev/preview
        }
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
