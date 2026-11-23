const mongoose = require("mongoose");

const skillListingSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        userName: {
            type: String,
            required: true
        },
        userPhoto: {
            type: String,
            default: ""
        },
        skill: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            required: true,
            default: "Technology"
        },
        mode: {
            type: String,
            enum: ["Online", "Offline", "Both"],
            default: "Both"
        },
        level: {
            type: String,
            enum: ["Beginner Friendly", "Intermediate", "Advanced / Expert"],
            default: "Intermediate"
        },
        status: {
            type: String,
            enum: ["pending", "approved", "removed"],
            default: "pending"
        }
    },
    {
        timestamps: true
    }
);

skillListingSchema.index({ category: 1, status: 1 });
skillListingSchema.index({ user: 1 });

const SkillListing = mongoose.model("SkillListing", skillListingSchema);
module.exports = SkillListing;

