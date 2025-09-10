// controllers/callController.js
import User from "../models/userModel.js";

// ✅ Save peerId for current user
export const savePeerId = async (req, res) => {
  try {
    const { peerId } = req.body;
    if (!peerId) return res.status(400).json({ message: "peerId is required" });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { peerId },
      { new: true }
    ).select("_id firstname lastname email role peerId");

    res.json({ message: "Peer ID saved", user });
  } catch (err) {
    console.error("❌ Save peerId error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get peerId of another user for calling
export const getPeerId = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("_id firstname lastname peerId");

    if (!user || !user.peerId) {
      return res.status(404).json({ message: "Peer ID not found for this user" });
    }

    res.json(user);
  } catch (err) {
    console.error("❌ Get peerId error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
