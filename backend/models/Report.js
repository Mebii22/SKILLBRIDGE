const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
    {
        from: {
            type: String,
            required: true
        },
        reporterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        target: {
            type: String,
            required: true
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        reason: {
            type: String,
            required: true,
            trim: true
        },
        date: {
            type: String,
            default: () => new Date().toISOString().split("T")[0]
        },
        status: {
            type: String,
            enum: ["open", "reviewed", "resolved"],
            default: "open"
        }
    },
    {
        timestamps: true
    }
);

reportSchema.index({ status: 1 });

const Report = mongoose.model("Report", reportSchema);
module.exports = Report;

