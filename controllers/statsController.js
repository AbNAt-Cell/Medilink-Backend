import User from "../models/userModel.js";
import { getOnlineDoctors } from "../socket/socket.js";

export const getDoctorStats = async (req, res) => {
  try {
    const totalDoctors = await User.countDocuments({ role: "doctor" });
    const onlineDoctorIds = await getOnlineDoctors();

    res.json({
      totalDoctors,
      onlineDoctors: onlineDoctorIds.length,
      onlineDoctorIds
    });
  } catch (err) {
    console.error("❌ Doctor stats error:", err.message, err);
    res.status(500).json({ message: err.message });
  }
};
