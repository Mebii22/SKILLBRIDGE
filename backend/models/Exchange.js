const mongoose = require("mongoose");

const sessionMilestoneSchema = new mongoose.Schema({
    sessionNum: { type: Number, required: true },
    title: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    duration: { type: String, default: "1 Hour" },
    topic: { type: String, default: "" },
    mode: { type: String, enum: ["Online", "Offline", "Both"], default: "Online" },
    meetingLink: { type: String, default: "" },
    meetingLocation: { type: String, default: "" },
    status: { type: String, enum: ["upcoming", "completed"], default: "upcoming" }
});

const agreementSchema = new mongoose.Schema({
    myCommitment: { type: String, default: "" },
    partnerCommitment: { type: String, default: "" },
    mode: { type: String, enum: ["Online", "Offline", "Both"], default: "Online" },
    totalSessions: { type: Number, default: 4 },
    duration: { type: String, default: "1 Hour" },
    schedule: { type: String, default: "Weekly on mutually agreed time" },
    meetingLink: { type: String, default: "" },
    location: { type: String, default: "" },
    status: { type: String, enum: ["pending", "active", "completed", "cancelled"], default: "pending" },
    acceptedAt: { type: String, default: null }
});

const exchangeSchema = new mongoose.Schema(
    {
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        partner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        teach: {
            type: String,
            required: true,
            trim: true
        },
        want: {
            type: String,
            required: true,
            trim: true
        },
        mode: {
            type: String,
            enum: ["Online", "Offline", "Both"],
            default: "Online"
        },
        totalSessions: {
            type: Number,
            default: 4,
            min: 1,
            max: 20
        },
        completedSessions: {
            type: Number,
            default: 0
        },
        progress: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        duration: {
            type: String,
            default: "1 Hour"
        },
        schedule: {
            type: String,
            default: "Weekly on mutually agreed time"
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
            enum: ["pending", "active", "completed", "rejected", "cancelled"],
            default: "pending"
        },
        agreement: {
            type: agreementSchema,
            default: () => ({})
        },
        sessions: [sessionMilestoneSchema],
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        review: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

exchangeSchema.index({ requester: 1, status: 1 });
exchangeSchema.index({ partner: 1, status: 1 });

const Exchange = mongoose.model("Exchange", exchangeSchema);
module.exports = Exchange;

