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

// Update doctor signature (replaces existing signature)
export const updateSignature = async (req, res) => {
  try {
    const { signatureBase64 } = req.body;

    if (!signatureBase64) {
      return res.status(400).json({ message: "Signature is required" });
    }

    // Get current user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If user has an existing signature, delete it from Cloudinary first
    if (user.signatureUrl) {
      try {
        // Extract public_id from Cloudinary URL
        const urlParts = user.signatureUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const publicId = `signatures/${fileName.split('.')[0]}`;
        
        await cloudinary.uploader.destroy(publicId);
        console.log(`🗑️ Deleted old signature: ${publicId}`);
      } catch (deleteError) {
        console.warn("⚠️ Could not delete old signature:", deleteError.message);
        // Continue with upload even if deletion fails
      }
    }

    // Upload new signature to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(signatureBase64, {
      folder: "signatures",
      resource_type: "image",
    });

    // Update user's signature URL
    user.signatureUrl = uploadResponse.secure_url;
    await user.save();

    console.log(`✅ Signature updated successfully for user: ${user._id}`);

    res.json({
      message: "Signature updated successfully",
      url: uploadResponse.secure_url,
      previousUrl: user.signatureUrl !== uploadResponse.secure_url ? user.signatureUrl : null
    });

  } catch (err) {
    console.error("❌ Signature update error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete signature
export const deleteSignature = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.signatureUrl) {
      return res.status(404).json({ message: "No signature found to delete" });
    }

    // Delete from Cloudinary
    try {
      const urlParts = user.signatureUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const publicId = `signatures/${fileName.split('.')[0]}`;
      
      await cloudinary.uploader.destroy(publicId);
      console.log(`🗑️ Deleted signature: ${publicId}`);
    } catch (deleteError) {
      console.warn("⚠️ Could not delete signature from Cloudinary:", deleteError.message);
    }

    // Remove signature URL from user
    user.signatureUrl = null;
    await user.save();

    console.log(`✅ Signature deleted successfully for user: ${user._id}`);

    res.json({
      message: "Signature deleted successfully"
    });

  } catch (err) {
    console.error("❌ Signature delete error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
