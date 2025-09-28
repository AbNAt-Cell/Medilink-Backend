import Clinic from "../models/clinic.js";
import bcrypt from "bcryptjs";

// ➕ Register a clinic
export const registerClinic = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      clientName,
      phoneNumber,
      email,
      password,
      confirmPassword,
      address
    } = req.body;

    if (
      !firstName || !lastName || !clientName ||
      !phoneNumber || !email || !password || !confirmPassword ||
      !address?.street || !address?.city || !address?.country
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // hash password if you keep it
    const hashed = await bcrypt.hash(password, 10);

    const clinic = await Clinic.create({
      firstName,
      lastName,
      clientName,
      phoneNumber,
      email,
      password: hashed,
      address,
      owner: req.user._id    // logged-in user creating it
    });

    res.status(201).json({
      message: "Clinic registered successfully",
      clinic
    });
  } catch (err) {
    console.error("❌ registerClinic error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🗂 All clinics
export const getClinics = async (_req, res) => {
  try {
    const clinics = await Clinic.find().populate("owner", "firstname lastname email");
    res.json(clinics);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// 🔎 Single clinic
export const getClinic = async (req, res) => {
  try {
    const clinic = await Clinic.findById(req.params.id)
      .populate("owner", "firstname lastname email");
    if (!clinic) return res.status(404).json({ message: "Clinic not found" });
    res.json(clinic);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ✏️ Update (only owner)
export const updateClinic = async (req, res) => {
  try {
    // Handle address field validation - prevent casting errors
    if (req.body.address && typeof req.body.address === 'string') {
      console.log("⚠️ Warning: Received string value for address field, expected object. Skipping address update.");
      delete req.body.address;
    }

    const clinic = await Clinic.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!clinic) return res.status(404).json({ message: "Clinic not found or not yours" });
    res.json({ message: "Clinic updated", clinic });
  } catch (err) {
    console.error("❌ updateClinic error:", err);
    
    // Handle address casting errors specifically
    if (err.message && err.message.includes("Cast to Embedded failed")) {
      return res.status(400).json({ 
        message: "Invalid address format. Address must be an object with properties like street, city, country, etc.", 
        example: {
          address: {
            street: "123 Main St",
            city: "New York", 
            region: "NY",
            postalCode: "10001",
            country: "USA"
          }
        }
      });
    }

    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ❌ Delete (only owner)
export const deleteClinic = async (req, res) => {
  try {
    const clinic = await Clinic.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!clinic) return res.status(404).json({ message: "Clinic not found or not yours" });
    res.json({ message: "Clinic deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
