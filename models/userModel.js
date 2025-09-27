// models/userModel.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, required: false },
    streetLine2: { type: String, required: false },
    city: { type: String, required: false },
    region: { type: String, required: false },
    postalCode: { type: String, required: false },
    country: { type: String, required: false },
  },
  { _id: false } // ✅ prevents creation of a separate _id for the subdocument
);

const userSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    middleName: String,
    dateofBirth: { type: Date, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    country: String,
    password: { type: String, required: true },
    avatarUrl: String,
    signatureUrl: { type: String, default: null },
    certificate: String,
    driversLicense: String,
    status: {
    type: String,
    enum: ["pending", "approved", "denied", "revoked"],
    default: "pending"
  },
    ssn: String,
    resume: String,
    bio: String,
    specialization: String, // for doctors

    // ✅ Embedded address object
    address: addressSchema,

    // ✅ Link to a clinic
    clinic: { type: mongoose.Schema.Types.ObjectId, ref: "Clinic", default: null },

    role: { type: String, enum: ["admin", "doctor", "marketer"], default: "doctor" },
    peerId: { type: String } // for WebRTC
  },
  { timestamps: true }
);

// Hash password
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
