import mongoose from "mongoose";

const formSchema = new mongoose.Schema(
  {
    marketer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // ✅ made optional
    clientName: String,
    clientEmail: String,
    clientPhone: String,
    details: String,
    sex: String,
    age: Number,
    preferredDate: Date,
    preferredTime: String,
    status: {
      type: String,
      enum: ["pending", "accepted", "completed", "rejected"],
      default: "pending"
    },
    assignedDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);


export default mongoose.model("Form", formSchema);
