import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
    
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Doctor can be null until one accepts
  marketer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    form: { type: mongoose.Schema.Types.ObjectId, ref: "Form" },
    date: Date,
    time: String,
    description: String,
    status: {
      type: String,
      enum: ["pending", "scheduled", "completed", "cancelled"],
      default: "pending"
    },
    assessment: String,       
    doctorSignatureUrl: String  
  },
  { timestamps: true }
);

export default mongoose.model("Appointment", appointmentSchema);
