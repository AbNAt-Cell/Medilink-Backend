import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

export const signup = async (req, res) => {
  try {
    if (!req.body.firstname || !req.body.email || !req.body.password || !req.body.role || !req.body.dateofBirth || !req.body.lastname || !req.body.phone) {
            return res.status(400).send({message: "Kindly input all required fields"})
          }

    const { firstname, lastname, phone, dateofBirth, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ firstname, lastname, phone, dateofBirth, email, password, role });
    res.status(201).json({ token: generateToken(user._id, user.role) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // // 🚫 Prevent login until admin approval
    // if (user.status !== "approved") {
    //   return res
    //     .status(403)
    //     .json({ message: "Your account is pending admin approval." });
    // }

    if (!user.role) {
      return res.status(500).json({ message: "User role is missing. Please contact support." });
    }

    res.json({ token: generateToken(user._id, user.role) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Return the current user
export const me = async (req, res) => {
  res.json(req.user);
};


export const editProfile = async (req, res) => {
  try {

    // Check if request body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }

    const allowed = ["firstname", "lastname", "phone", "dateofBirth", "avatarUrl", "country", "bio", "specialization", "address"];
    const updates = {};
    
    // Process allowed fields
    for (const key of allowed) {
      if (req.body[key] !== undefined && req.body[key] !== null && req.body[key] !== "") {
        updates[key] = req.body[key];
      }
    }

    console.log("✅ Filtered updates:", JSON.stringify(updates, null, 2));

    // Check if there are any valid updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    // Handle nested address updates
    if (updates.address && typeof updates.address === 'object') {
      // Get current user to merge address
      const currentUser = await User.findById(req.user._id);
      updates.address = {
        ...currentUser.address,
        ...updates.address
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("🎉 Profile updated successfully for user:", updatedUser._id);

    res.json({ 
      message: "Profile updated successfully", 
      user: updatedUser,
      updatedFields: Object.keys(updates)
    });
  } catch (err) {
    console.error("❌ editProfile error:", err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        message: "Validation error", 
        errors 
      });
    }

    // Handle duplicate key errors
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ 
        message: `${field} already exists. Please use a different ${field}.` 
      });
    }

    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// Search users by name, email, or phone
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    // case-insensitive regex search on firstname, lastname, email, phone
    const users = await User.find({
      $or: [
        { firstname: { $regex: query, $options: "i" } },
        { lastname: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { phone: { $regex: query, $options: "i" } },
      ],
    }).select("-password"); // hide password

    res.json(users);
  } catch (err) {
    console.error("Error searching users:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Search users for messaging
// Marketer -> see doctors
// Doctor -> see marketers
// Admin -> see all
export const searchMessagingUsers = async (req, res) => {
  try {
    const role = req.user.role;

    let filter = {};
    if (role === "marketer") {
      filter = { role: "doctor" };
    } else if (role === "doctor") {
      filter = { role: "marketer" };
    } // admin sees all

    const users = await User.find(filter).select("firstname lastname email role");

    res.json(users);
  } catch (err) {
    console.error("❌ searchMessagingUsers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get public details of a user by id
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .select("-password")
      .populate("clinic");   // ✅ populate clinic details
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

