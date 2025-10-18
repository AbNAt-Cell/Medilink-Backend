import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/userModel.js";
import { onlineUsers } from "../socket/socket.js";

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

export const signup = async (req, res) => {
  try {
    if (!req.body.firstname || !req.body.email || !req.body.password || !req.body.role || !req.body.dateofBirth || !req.body.lastname || !req.body.phone) {
            return res.status(400).send({message: "Kindly input all required fields"})
          }

    // Extract required fields
    const { firstname, lastname, phone, dateofBirth, email, password, role } = req.body;

    // Extract optional fields
    const { 
      middleName, 
      country, 
      sex,
      bio, 
      specialization, 
      ssn, 
      resume, 
      certificate, 
      driversLicense,
      address,
      addressString,
      clinicInfo,
      avatarUrl,
      signatureUrl,
      peerId,
      clinic
    } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    // Create user data object with all provided fields
    const userData = {
      firstname, 
      lastname, 
      phone, 
      dateofBirth, 
      email, 
      password, 
      role
    };

    // Add optional fields if provided
    if (middleName) userData.middleName = middleName;
    if (country) userData.country = country;
    if (sex) userData.sex = sex;
    if (bio) userData.bio = bio;
    if (specialization) userData.specialization = specialization;
    if (ssn) userData.ssn = ssn;
    if (resume) userData.resume = resume;
    if (certificate) userData.certificate = certificate;
    if (driversLicense) userData.driversLicense = driversLicense;
    if (address) userData.address = address;
    if (addressString) userData.addressString = addressString;
    if (clinicInfo) userData.clinicInfo = clinicInfo;
    if (avatarUrl) userData.avatarUrl = avatarUrl;
    if (signatureUrl) userData.signatureUrl = signatureUrl;
    if (peerId) userData.peerId = peerId;
    if (clinic) userData.clinic = clinic;

    console.log("📝 Creating user with data:", JSON.stringify(userData, null, 2));

    const user = await User.create(userData);
    
    console.log("✅ User created successfully with ID:", user._id);
    
    res.status(201).json({ 
      token: generateToken(user._id, user.role),
      user: {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        role: user.role,
        status: user.status,
        address: user.address,
        addressString: user.addressString
      }
    });
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
  try {
    // Fetch user with all fields except password and sensitive data
    const user = await User.findById(req.user._id)
      .select("-password -resetPasswordToken -resetPasswordExpires");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add online status to user profile
    const userObj = user.toObject();
    const isOnline = onlineUsers.has(req.user._id.toString());
    const userWithOnlineStatus = {
      ...userObj,
      isOnline: isOnline
    };
    
    res.json(userWithOnlineStatus);
  } catch (err) {
    console.error("❌ me endpoint error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const editProfile = async (req, res) => {
  try {
    // Check if request body is empty
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "No update data provided" });
    }

    // Get current user first
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Define allowed fields for update
    const allowed = [
      "firstname", 
      "lastname", 
      "middleName",
      "phone", 
      "dateofBirth", 
      "sex",
      "avatarUrl", 
      "signatureUrl",
      "country", 
      "bio", 
      "specialization", 
      "certificate",
      "driversLicense",
      "resume",
      "ssn",
      "address", 
      "addressString", 
      "clinicInfo"
    ];

    // Build update object with proper handling for each field type
    const updates = {};
    
    for (const key of allowed) {
      if (req.body.hasOwnProperty(key)) {
        const value = req.body[key];
        
        // Handle null values (allow clearing fields)
        if (value === null) {
          updates[key] = null;
          continue;
        }
        
        // Handle undefined (skip)
        if (value === undefined) {
          continue;
        }
        
        // Handle string fields
        if (typeof value === "string") {
          // Allow empty strings for some fields, but skip for others
          if (value === "" && ["bio", "specialization", "middleName", "country", "certificate", "driversLicense", "resume", "ssn", "addressString"].includes(key)) {
            updates[key] = ""; // Allow empty strings for optional text fields
          } else if (value.trim() !== "") {
            updates[key] = value.trim();
          }
          continue;
        }
        
        // Handle nested address object
        if (key === "address" && typeof value === "object" && value !== null) {
          // Validate address structure
          const addressFields = ["street", "streetLine2", "city", "region", "postalCode", "country"];
          const validAddress = {};
          
          for (const addrField of addressFields) {
            if (value.hasOwnProperty(addrField)) {
              if (typeof value[addrField] === "string") {
                validAddress[addrField] = value[addrField].trim();
              } else if (value[addrField] === null) {
                validAddress[addrField] = null;
              }
            }
          }
          
          // Only update if at least one valid address field is provided
          if (Object.keys(validAddress).length > 0) {
            updates[key] = {
              ...(currentUser.address?.toObject() || {}),
              ...validAddress
            };
          }
          continue;
        }
        
        // Handle nested clinicInfo object
        if (key === "clinicInfo" && typeof value === "object" && value !== null) {
          // Validate clinicInfo structure
          const clinicFields = ["clinicName", "clinicAddress", "clinicEmail", "clinicPhone"];
          const validClinicInfo = {};
          
          for (const clinicField of clinicFields) {
            if (value.hasOwnProperty(clinicField)) {
              if (typeof value[clinicField] === "string") {
                validClinicInfo[clinicField] = value[clinicField].trim();
              } else if (value[clinicField] === null) {
                validClinicInfo[clinicField] = null;
              }
            }
          }
          
          // Only update if at least one valid clinic field is provided
          if (Object.keys(validClinicInfo).length > 0) {
            updates[key] = {
              ...(currentUser.clinicInfo?.toObject() || {}),
              ...validClinicInfo
            };
          }
          continue;
        }
        
        // Handle other field types (dates, numbers, etc.)
        updates[key] = value;
      }
    }

    // Check if there are any valid updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    console.log("🔄 Processing updates:", Object.keys(updates));
    if (updates.address) console.log("📍 Address update:", JSON.stringify(updates.address, null, 2));
    if (updates.clinicInfo) console.log("🏥 ClinicInfo update:", JSON.stringify(updates.clinicInfo, null, 2));
    if (updates.sex) console.log("👤 Sex update:", updates.sex);

    // Use findByIdAndUpdate with proper options
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates }, // Use $set operator for explicit field updates
      { 
        new: true, 
        runValidators: true,
        upsert: false // Don't create if user doesn't exist
      }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found after update" });
    }

    console.log("✅ Profile updated successfully for user:", updatedUser._id);
    
    res.json({ 
      message: "Profile updated successfully", 
      user: updatedUser,
      updatedFields: Object.keys(updates)
    });
  } catch (err) {
    console.error("❌ editProfile error:", err);
    
    // Enhanced error logging for validation issues
    if (err.name === 'ValidationError') {
      console.error("❌ Validation details:", err.errors);
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        message: "Validation error", 
        errors 
      });
    }
    
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

    // Add online status to users
    const usersWithOnlineStatus = users.map(user => {
      const userObj = user.toObject();
      const isOnline = onlineUsers.has(user._id.toString());
      return {
        ...userObj,
        isOnline: isOnline,
        status: isOnline ? "online" : "offline"
      };
    });

    res.json(usersWithOnlineStatus);
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

    const users = await User.find(filter).select("firstname lastname email role avatarUrl");

    // Add online status to users
    const usersWithOnlineStatus = users.map(user => {
      const userObj = user.toObject();
      const isOnline = onlineUsers.has(user._id.toString());
      return {
        ...userObj,
        isOnline: isOnline
      };
    });

    res.json(usersWithOnlineStatus);
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
      .select("-password -resetPasswordToken -resetPasswordExpires");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Add online status to user profile
    const userObj = user.toObject();
    const isOnline = onlineUsers.has(userId);
    const userWithOnlineStatus = {
      ...userObj,
      isOnline: isOnline
    };
    
    res.json(userWithOnlineStatus);
  } catch (err) {
    
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 🔄 Request Password Reset
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set token and expiration (1 hour from now)
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    await user.save();

    console.log(`🔑 Password reset token generated for user: ${user.email}`);
    console.log(`🔗 Reset token: ${resetToken}`); // In production, this would be sent via email

    res.status(200).json({ 
      message: "If an account with that email exists, a password reset link has been sent.",
      // In development, include the token. Remove in production!
      resetToken: resetToken 
    });

  } catch (err) {
    console.error("❌ requestPasswordReset error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔒 Reset Password
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ 
        message: "Reset token and new password are required" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: "Password must be at least 6 characters long" 
      });
    }

    // Find user with valid reset token that hasn't expired
    const user = await User.findOne({
      resetPasswordToken: resetToken,
      resetPasswordExpires: { $gt: new Date() } // Token not expired
    });

    if (!user) {
      return res.status(400).json({ 
        message: "Invalid or expired reset token" 
      });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    
    // Clear reset token fields
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    
    await user.save();

    console.log(`✅ Password successfully reset for user: ${user.email}`);

    res.status(200).json({ 
      message: "Password has been successfully reset. You can now login with your new password." 
    });

  } catch (err) {
    console.error("❌ resetPassword error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🔐 Change Password (for authenticated users)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: "Current password and new password are required" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: "New password must be at least 6 characters long" 
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        message: "New password must be different from current password" 
      });
    }

    // Get user with password field
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.matchPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        message: "Current password is incorrect" 
      });
    }

    // Update password (will be hashed by pre-save middleware)
    user.password = newPassword;
    await user.save();

    console.log(`✅ Password successfully changed for user: ${user.email}`);

    res.status(200).json({ 
      message: "Password changed successfully" 
    });

  } catch (err) {
    console.error("❌ changePassword error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🧪 TESTING: Set user online status manually (for Thunder Client testing)
export const setUserOnlineStatus = async (req, res) => {
  try {
    const { userId, online } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    if (online) {
      // Set user online with fake socket ID
      onlineUsers.set(userId, { socketId: `test-${Date.now()}` });
      console.log(`🧪 User ${userId} set to ONLINE`);
    } else {
      // Set user offline
      onlineUsers.delete(userId);
      console.log(`🧪 User ${userId} set to OFFLINE`);
    }

    const onlineUsersList = Array.from(onlineUsers.keys());
    console.log(`📊 Current online users:`, onlineUsersList);
    
    res.json({
      message: `User ${userId} is now ${online ? 'ONLINE' : 'OFFLINE'}`,
      onlineUsers: onlineUsersList
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Debug endpoint to check online users
export const getOnlineUsersDebug = async (req, res) => {
  try {
    const onlineUsersList = Array.from(onlineUsers.keys());
    const onlineUsersMap = Array.from(onlineUsers.entries()).map(([userId, data]) => ({
      userId,
      socketId: data.socketId,
      peerId: data.peerId || null
    }));
    
    console.log(`🔍 DEBUG - Current online users:`, onlineUsersList);
    console.log(`🔍 DEBUG - Online users map:`, onlineUsersMap);
    
    res.json({
      count: onlineUsersList.length,
      userIds: onlineUsersList,
      usersMap: onlineUsersMap,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

