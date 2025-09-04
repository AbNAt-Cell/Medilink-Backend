import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    marketer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    form: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },
    date: Date,
    time: String,
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
