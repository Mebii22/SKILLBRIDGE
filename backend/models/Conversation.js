const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        text: {
            type: String,
            required: true,
            trim: true
        },
        read: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

const conversationSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            }
        ],
        messages: [messageSchema],
        lastMessage: {
            type: String,
            default: ""
        },
        lastMessageAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation;

