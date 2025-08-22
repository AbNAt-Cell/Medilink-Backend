import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    form: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
    marketer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
