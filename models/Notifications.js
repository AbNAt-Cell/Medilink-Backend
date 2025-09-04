// models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // doctor
    type: {
      type: String,
      enum: ["form", "reminder", "appointment"],
      required: true
    },
    message: { type: String, required: true },
    link: String, // frontend link e.g. /forms/:id or /appointments/:id
    read: { type: Boolean, default: false },
    recurring: { type: Boolean, default: false } // for reminders
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
