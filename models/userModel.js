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
  signatureUrl: String,
  address: String,
  bio: String,
  specialization: String, // for doctors
  role: { type: String, enum: ["admin", "doctor", "marketer"], default: "doctor" }
}, { timestamps: true });

// Hash password before saving
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
