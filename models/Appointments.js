// models/Appointment.js
import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    sex: String,
    age: Number,
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    marketer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    client: clientSchema,                            // ✅ embedded client info
    date: { type: Date, required: true },
    time: { type: String, required: true },
    createdby: { type: String },
    description: { type: String },
    status: {
      type: String,
      enum: ["pending", "scheduled", "completed", "cancelled"],
      default: "pending"
    },
    assessment: String,
    doctorSignatureUrl: String,
  
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
