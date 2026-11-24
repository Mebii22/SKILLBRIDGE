const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
    {
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false
        },
        adminName: {
            type: String,
            default: "SKILLBRIDGE Admin"
        },
        action: {
            type: String,
            enum: [
                "USER_DISABLED",
                "USER_ACTIVATED",
                "USER_DELETED",
                "SKILL_APPROVED",
                "SKILL_REMOVED",
                "SKILL_RESTORED",
                "REPORT_RESOLVED",
                "EXCHANGE_DELETED",
                "SYSTEM_NOTICE"
            ],
            default: "SYSTEM_NOTICE"
        },
        targetType: {
            type: String,
            enum: ["User", "Skill", "UserSkill", "SkillListing", "Exchange", "Session", "Report", "System"],
            default: "System"
        },
        targetId: {
            type: String,
            default: ""
        },
        targetName: {
            type: String,
            default: ""
        },
        reason: {
            type: String,
            default: ""
        },
        text: {
            type: String,
            required: true,
            trim: true
        },
        time: {
            type: String,
            default: "Just now"
        }
    },
    {
        timestamps: true
    }
);

activitySchema.index({ createdAt: -1 });
activitySchema.index({ action: 1 });

const Activity = mongoose.model("Activity", activitySchema);
module.exports = Activity;
