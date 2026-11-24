const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
        partner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        exchangeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Exchange"
        },
        title: {
            type: String,
            default: "",
            trim: true
        },
        topic: {
            type: String,
            default: "",
            trim: true
        },
        sessionNum: {
            type: Number,
            default: 1
        },
        skill: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: "",
            trim: true
        },
        notes: {
            type: String,
            default: "",
            trim: true
        },
        date: {
            type: String,
            required: true
        },
        time: {
            type: String,
            required: true
        },
        duration: {
            type: String,
            default: "1 Hour"
        },
        mode: {
            type: String,
            enum: ["Online", "Offline", "Online Video", "In-Person", "Both"],
            default: "Online Video"
        },
        meetingLink: {
            type: String,
            default: ""
        },
        meetingLocation: {
            type: String,
            default: ""
        },
        status: {
            type: String,
            enum: ["upcoming", "completed", "cancelled"],
            default: "upcoming"
        }
    },
    {
        timestamps: true
    }
);

sessionSchema.index({ user: 1, date: 1 });
sessionSchema.index({ partner: 1, date: 1 });

const Session = mongoose.model("Session", sessionSchema);
module.exports = Session;

