const User = require("../models/User");
const Activity = require("../models/Activity");
const Report = require("../models/Report");
const SkillListing = require("../models/SkillListing");
const bcrypt = require("bcryptjs");

const seedDatabase = async () => {
    try {
        // 1. Seed Administrator if none exists
        const adminEmail = (process.env.ADMIN_EMAIL || "admin@skillbridge.com").toLowerCase().trim();
        const existingAdmin = await User.findOne({
            $or: [
                { role: "admin" },
                { email: adminEmail }
            ]
        });

        if (!existingAdmin) {
            const rawPassword = process.env.ADMIN_PASSWORD;
            if (!rawPassword || rawPassword.trim().length < 8) {
                console.warn("⚠️ Admin seeding skipped: ADMIN_PASSWORD environment variable must be explicitly configured with at least 8 characters.");
            } else {
                const adminPassword = await bcrypt.hash(rawPassword.trim(), 12);
                await User.create({
                    name: "Admin",
                    fullName: "SKILLBRIDGE Admin",
                    email: adminEmail,
                    password: adminPassword,
                    city: "Kochi",
                    location: "Kochi, Kerala",
                    bio: "Official SkillBridge Platform Administrator.",
                    role: "admin",
                    status: "Active"
                });
                console.log(`✓ Initialized Admin account: ${adminEmail}`);
            }
        }

        // 2. Check if community members exist
        const userCount = await User.countDocuments({ role: "user" });
        if (userCount === 0) {
            const defaultPw = await bcrypt.hash("password123", 12);

            // Seed Mebin Joseph (demo account)
            const mebin = await User.create({
                name: "Mebin",
                fullName: "Mebin Joseph",
                email: "mebin@skillbridge.com",
                password: defaultPw,
                city: "Kochi",
                location: "Kochi, Kerala",
                photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
                bio: "Passionate full-stack developer & tech enthusiast. Love building React & Node.js applications.",
                mode: "Both",
                availability: "Weekends & weekday evenings",
                category: "Technology",
                teaches: ["Web Development", "React.js", "JavaScript"],
                wants: ["German", "Photography", "UI Design"],
                rating: 4.9,
                completed: 8,
                status: "Active",
                role: "user",
                socials: {
                    instagram: "mebin_dev",
                    twitter: "mebin_codes",
                    linkedin: "",
                    github: "Mebii22"
                }
            });

            // Seed Community Partners
            const demoPartners = [
                {
                    name: "Arjun",
                    fullName: "Arjun Madhavan",
                    email: "arjun.m@example.com",
                    city: "Thrissur",
                    location: "Thrissur, Kerala",
                    photo: "https://randomuser.me/api/portraits/men/32.jpg",
                    bio: "Visual storyteller and documentary photographer with 5+ years of freelance experience.",
                    mode: "Offline",
                    availability: "Saturdays 2:00 PM – 6:00 PM",
                    category: "Photography",
                    teaches: ["Photography", "Photo Editing", "Lightroom"],
                    wants: ["React.js", "Web Development"],
                    rating: 5.0,
                    completed: 18,
                    reviews: [
                        { from: "Mebin J.", rating: 5, text: "Arjun explained aperture, shutter speed, and composition so clearly!" }
                    ]
                },
                {
                    name: "Sara",
                    fullName: "Sara Khan",
                    email: "sara.k@example.com",
                    city: "Kochi",
                    location: "Kochi, Kerala",
                    photo: "https://randomuser.me/api/portraits/women/44.jpg",
                    bio: "Certified Goethe-Institut B2 speaker and language enthusiast.",
                    mode: "Online",
                    availability: "Mon, Wed, Fri evenings",
                    category: "Languages",
                    teaches: ["German", "Spoken English"],
                    wants: ["Web Development", "Python"],
                    rating: 4.8,
                    completed: 12,
                    reviews: [
                        { from: "Rahul V.", rating: 5, text: "Sara's German pronunciation drills are fantastic." }
                    ]
                },
                {
                    name: "Divya",
                    fullName: "Divya Menon",
                    email: "divya.m@example.com",
                    city: "Trivandrum",
                    location: "Trivandrum, Kerala",
                    photo: "https://randomuser.me/api/portraits/women/33.jpg",
                    bio: "Senior product designer at a SaaS startup. Passionate about design systems and Figma.",
                    mode: "Both",
                    availability: "Weekends 10:00 AM – 2:00 PM",
                    category: "Design",
                    teaches: ["UI Design", "Figma", "User Research"],
                    wants: ["JavaScript", "React.js"],
                    rating: 4.9,
                    completed: 21,
                    reviews: [
                        { from: "Priya S.", rating: 5, text: "Incredible design mentorship!" }
                    ]
                },
                {
                    name: "Rahul",
                    fullName: "Rahul Varma",
                    email: "rahul.v@example.com",
                    city: "Kozhikode",
                    location: "Kozhikode, Kerala",
                    photo: "https://randomuser.me/api/portraits/men/45.jpg",
                    bio: "Acoustic guitarist and composer. Teaching fingerstyle and chord theory.",
                    mode: "Both",
                    availability: "Weekday afternoons",
                    category: "Music",
                    teaches: ["Guitar Basics", "Music Theory"],
                    wants: ["Graphic Design", "Video Editing"],
                    rating: 4.9,
                    completed: 9
                }
            ];

            for (const p of demoPartners) {
                const partner = await User.create({
                    ...p,
                    password: defaultPw,
                    status: "Active",
                    role: "user"
                });

                // Seed a SkillListing for each partner
                await SkillListing.create({
                    user: partner._id,
                    userName: partner.fullName,
                    userPhoto: partner.photo,
                    skill: partner.teaches[0],
                    category: partner.category,
                    mode: partner.mode,
                    level: "Intermediate",
                    status: "approved"
                });
            }

            // Seed initial reports and activities
            await Report.create({
                from: "Arjun M.",
                target: "Inappropriate Listing",
                reason: "User posted duplicate listing with incomplete details.",
                status: "open"
            });

            await Activity.create({
                text: "Platform database initialized with community seed data."
            });

            console.log("✓ Seeded community demo members (Mebin, Arjun, Sara, Divya, Rahul) with password: password123");
        }
    } catch (err) {
        console.error("Database seed error:", err.message);
    }
};

module.exports = { seedDatabase };

