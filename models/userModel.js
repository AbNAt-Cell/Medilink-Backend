// models/userModel.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  dateofBirth: { type: Date, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  country: String,
  password: { type: String, required: true },
  avatarUrl: String,
  signatureUrl: { type: String, default: null },
  address: String,
  bio: String,
  specialization: String, // for doctors
  role: { type: String, enum: ["admin", "doctor", "marketer"], default: "doctor" },
  peerId: { type: String } // ✅ Added for WebRTC peer connections
}, { timestamps: true });

// Password hash middleware
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
