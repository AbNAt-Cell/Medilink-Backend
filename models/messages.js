import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: false }, // Optional when url is provided
    url: { type: String, required: false }, // For file/image attachments
    type: { 
      type: String, 
      enum: ["text", "image", "file", "audio", "video", "voice", "audioCall", "videoCall", "missedCall"], 
      default: "text" 
    },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
