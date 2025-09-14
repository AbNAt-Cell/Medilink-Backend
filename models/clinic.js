import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  street: String,
  streetLine2: String,
  city: String,
  region: String,
  postalCode: String,
  country: String,
});

const clinicSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },     // owner/registrant first name
    lastName:  { type: String, required: true },
    clientName:{ type: String, required: true },     // clinic or business name
    phoneNumber:{ type: String, required: true },
    email:     { type: String, required: true, unique: true },
    password:  { type: String, required: true },     // optional if you need login
    address:   { type: addressSchema, required: true },
    owner:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Clinic", clinicSchema);
