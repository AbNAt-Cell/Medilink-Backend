import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  marketer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    form: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },
    date: Date,
    time: String,
    description: String,
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
