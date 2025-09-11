import cloudinary from "../services/cloudinary.js";
import User from "../models/userModel.js";

// Upload doctor signature (base64 from signature pad)
export const uploadSignature = async (req, res) => {
  try {
    const { signatureBase64 } = req.body;

    if (!signatureBase64) {
      return res.status(400).json({ message: "Signature is required" });
    }

    // Upload base64 to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(signatureBase64, {
      folder: "signatures",
      resource_type: "image",
    });

    // Save signature URL to the doctor’s profile
    const doctor = await User.findById(req.user._id);
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    doctor.signatureUrl = uploadResponse.secure_url;
    await doctor.save();

    res.json({
      message: "Signature uploaded successfully",
      url: uploadResponse.secure_url,
    });
  } catch (err) {
    console.error("❌ Signature upload error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
