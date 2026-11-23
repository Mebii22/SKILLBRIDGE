const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        // Basic Information
        name: {
            type: String,
            required: true,
            trim: true
        },

        fullName: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            minlength: 6,
            select: false
        },

        // Profile Information
        city: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            type: String,
            default: ""
        },

        photo: {
            type: String,
            default: ""
        },

        bio: {
            type: String,
            default: ""
        },

        // Learning Preferences
        mode: {
            type: String,
            enum: ["Online", "Offline", "Both"],
            default: "Both"
        },

        availability: {
            type: String,
            default: "Flexible"
        },

        category: {
            type: String,
            default: "Technology"
        },

        teaches: [{
            type: String,
            trim: true
        }],

        wants: [{
            type: String,
            trim: true
        }],

        // User Statistics
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },

        completed: {
            type: Number,
            default: 0
        },

        // Account Management
        status: {
            type: String,
            enum: ["Active", "Disabled"],
            default: "Active"
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user"
        },

        // Social Media
        socials: {
            instagram: {
                type: String,
                default: ""
            },

            twitter: {
                type: String,
                default: ""
            },

            linkedin: {
                type: String,
                default: ""
            },

            github: {
                type: String,
                default: ""
            }
        },

        // Saved Profiles
        savedProfiles: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],

        // User Reviews
        reviews: [{
            from: {
                type: String,
                required: true
            },

            fromId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },

            rating: {
                type: Number,
                min: 1,
                max: 5
            },

            text: {
                type: String,
                trim: true
            },

            date: {
                type: String,
                default: () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            }
        }]
    },
    {
        timestamps: true
    }
);

userSchema.index({ status: 1 });
userSchema.index({ name: "text", fullName: "text", city: "text", teaches: "text", wants: "text" });

// Create User Model
const User = mongoose.model("User", userSchema);

module.exports = User;