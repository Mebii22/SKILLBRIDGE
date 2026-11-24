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
            required: true,
            trim: true
        },
        userPhoto: {
            type: String,
            default: ""
        },
        title: {
            type: String,
            trim: true
        },
        skill: {
            type: String,
            required: true,
            trim: true
        },
        category: {
            type: String,
            required: true,
            default: "Technology",
            trim: true
        },
        description: {
            type: String,
            default: "",
            trim: true
        },
        level: {
            type: String,
            enum: ["Beginner", "Beginner Friendly", "Intermediate", "Advanced", "Advanced / Expert"],
            default: "Intermediate"
        },
        mode: {
            type: String,
            enum: ["Online", "Offline", "Both"],
            default: "Both"
        },
        availability: {
            type: String,
            default: "Flexible",
            trim: true
        },
        location: {
            type: String,
            default: "",
            trim: true
        },
        experience: {
            type: String,
            default: "",
            trim: true
        },
        status: {
            type: String,
            enum: ["pending", "approved", "removed"],
            default: "approved"
        }
    },
    {
        timestamps: true
    }
);

// Pre-save hook to keep title and skill synchronized
skillListingSchema.pre("save", function () {
    if (this.title && !this.skill) {
        this.skill = this.title;
    }
    if (this.skill && !this.title) {
        this.title = this.skill;
    }
});

skillListingSchema.index({ category: 1, status: 1 });
skillListingSchema.index({ user: 1, createdAt: -1 });

const SkillListing = mongoose.model("SkillListing", skillListingSchema);
module.exports = SkillListing;
