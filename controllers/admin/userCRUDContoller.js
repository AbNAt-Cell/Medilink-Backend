import User from "../../models/userModel.js";
import jwt from "jsonwebtoken";
import { onlineUsers } from "../../socket/socket.js";
import Message from "../../models/messages.js";
import Conversation from "../../models/Conversation.js";
import Notification from "../../models/Notifications.js";
import Form from "../../models/Form.js";
import Appointment from "../../models/Appointments.js";

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });

export const listUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

// ✅ Admin creates a new user (doctor / marketer / admin)
export const createUser = async (req, res) => {
   try {
    // defensive: make sure body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ message: "Request body is missing" });
    }

    // Accept both camelCase and alternate keys
    const b = req.body;
    const firstname   = b.firstname   || b.firstName;
    const lastname    = b.lastname    || b.lastName;
    const middleName  = b.middleName  || b.middlename || "";
    const dateofBirth = b.dateofBirth || b.dateOfBirth;
    const phone       = b.phone || b.phoneNumber;
    const email       = b.email;
    const password    = b.password;
    const role        = b.role || "doctor";


    // address object (frontend requires it)
    const address = b.address || b.Address || null;

    // required top-level fields
    if (!firstname || !lastname || !phone || !dateofBirth || !email || !password) {
      return res.status(400).json({ message: "Kindly input all required fields" });
    }

    // validate address sub-fields if frontend requires them
    if (!address ||
        !address.street ||
        !address.city ||
        !address.region ||
        !address.postalCode ||
        !address.country
    ) {
      return res.status(400).json({
        message:
          "Complete address required: street, city, region, postalCode, country"
      });
    }

    // check for existing email or phone
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: "Email already registered" });


    // Optional: validate clinic id exists (uncomment if desired)
    // if (clinic) {
    //   const found = await Clinic.findById(clinic);
    //   if (!found) return res.status(400).json({ message: "Clinic not found" });
    // }

    // create user (your user schema has pre-save password hash)
    const user = await User.create({
      firstname,
      lastname,
      dateofBirth,
      phone,
      email,
      password,
      role,
      address
    });

    // remove password from returned user
    const safe = user.toObject();
    delete safe.password;

    // issue token
    const token = generateToken(user._id, user.role);

    return res.status(201).json({ token, user: safe });
  } catch (err) {
    console.error("❌ Signup error:", err);
    // expose a helpful message (but not sensitive internals)
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

export const editUser = async (req, res) => {
  const { id } = req.params;
  if (!req.body)
    return res.status(400).json({ message: "Missing request body" });
  const { lastname, firstname, dateofBirth, phone, email, role } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      id,
      { lastname, firstname, dateofBirth, phone, email, role },
      { new: true, runValidators: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    // Check if user exists first
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deletion of the last admin
    if (user.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return res.status(400).json({ 
          message: "Cannot delete the last admin user" 
        });
      }
    }

    // Clean up related data efficiently with Promise.all
    await Promise.all([
      // Remove user from conversations (update participants)
      Conversation.updateMany(
        { participants: id },
        { $pull: { participants: id } }
      ),
      
      // Delete messages sent by this user
      Message.deleteMany({ sender: id }),
      
      // Delete notifications for this user
      Notification.deleteMany({ user: id }),
      
      // Update forms - remove user reference or reassign
      Form.updateMany(
        { claimedBy: id },
        { $unset: { claimedBy: 1 }, status: "pending" }
      ),

      // Handle appointments - delete appointments where user is doctor or marketer
      Appointment.deleteMany({
        $or: [
          { doctor: id },
          { marketer: id }
        ]
      })
    ]);

    // Remove empty conversations (no participants left)
    await Conversation.deleteMany({ participants: { $size: 0 } });

    // Remove from online users if connected
    if (onlineUsers.has(id)) {
      onlineUsers.delete(id);
      console.log(`🗑️ Removed deleted user ${id} from online users`);
    }

    // Delete the user
    await User.findByIdAndDelete(id);

    console.log(`✅ User ${user.email} (${user.role}) deleted successfully`);
    
    res.json({ 
      message: "User and associated data deleted successfully",
      deletedUser: {
        id: user._id,
        email: user.email,
        name: `${user.firstname} ${user.lastname}`,
        role: user.role
      }
    });
  } catch (err) {
    console.error("❌ Delete user error:", err);
    res.status(500).json({ 
      message: "Failed to delete user", 
      error: err.message 
    });
  }
};


export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const allowed = ["approved", "denied", "revoked"];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Use one of: ${allowed.join(", ")}`
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    ).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      message: `User status updated to ${status}`,
      user
    });
  } catch (err) {
    console.error("updateUserStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
