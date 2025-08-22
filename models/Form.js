import mongoose from "mongoose";

const formSchema = new mongoose.Schema(
  {
    clientName: { type: String, required: true },
    sex: { type: String, required: true},
    age: { type: Number, required: true },
    appointmentDate: { type: Date, required: true },
    appointmentTime: { type: String, required: true },
    details: { type: String, required: true },
    marketer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    assessment: { type: String },
    // Auto-added when doctor submits
    assessmentSignature: { type: String },
    assessmentSignedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("Form", formSchema);
