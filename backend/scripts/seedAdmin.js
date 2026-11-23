const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load backend .env
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const User = require("../models/User");

const seedAdmin = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error("❌ MONGO_URI is not set in backend/.env");
            process.exit(1);
        }

        console.log("Connecting to MongoDB for Admin Initialization...");
        await mongoose.connect(mongoUri);
        console.log("✓ Connected to MongoDB.");

        const adminEmail = (process.env.ADMIN_EMAIL || "admin@skillbridge.com").toLowerCase().trim();
        const rawPassword = process.env.ADMIN_PASSWORD;

        if (!rawPassword || rawPassword.trim().length < 8) {
            console.error("❌ Admin Seeding Aborted: ADMIN_PASSWORD environment variable must be explicitly configured with at least 8 characters.");
            await mongoose.disconnect();
            process.exit(1);
        }

        // Check if an administrator already exists
        const existingAdmin = await User.findOne({
            $or: [
                { role: "admin" },
                { email: adminEmail }
            ]
        });

        if (existingAdmin) {
            console.log(`ℹ️ An administrator account already exists: '${existingAdmin.email}' (ID: ${existingAdmin._id}).`);
            console.log("Duplicate admin initialization was prevented.");
            await mongoose.disconnect();
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(rawPassword.trim(), 12);

        const newAdmin = await User.create({
            name: "Admin",
            fullName: "SKILLBRIDGE Admin",
            email: adminEmail,
            password: hashedPassword,
            city: "Kochi",
            location: "Kochi, Kerala",
            bio: "Official SkillBridge Platform Administrator.",
            role: "admin",
            status: "Active"
        });

        console.log(`✓ Initial administrator account created successfully!`);
        console.log(`  - ID: ${newAdmin._id}`);
        console.log(`  - Email: ${newAdmin.email}`);
        console.log(`  - Role: ${newAdmin.role}`);
        console.log(`  - Status: ${newAdmin.status}`);

        await mongoose.disconnect();
        console.log("✓ Disconnected cleanly.");
        process.exit(0);

    } catch (error) {
        console.error("❌ Admin Seeding Failed:", error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

seedAdmin();

