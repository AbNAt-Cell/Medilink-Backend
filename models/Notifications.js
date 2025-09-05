// models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // recipient
  type: { type: String, enum: ["form", "appointment", "reminder"], required: true },
    message: { type: String, required: true },
    link: { type: String }, // clickable link (e.g. /forms/:id, /appointments/:id)
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
