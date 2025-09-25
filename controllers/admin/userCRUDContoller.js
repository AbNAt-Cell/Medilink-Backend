import User from "../../models/userModel.js";
import jwt from "jsonwebtoken";

const generateToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });

export const listUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

// ✅ Admin creates a new user (doctor / marketer / admin)
export const createUser = async (req, res) => {
  try {
    const b = req.body;

    // Support camelCase or PascalCase from frontend
    const firstname   = b.firstname   || b.firstName;
    const lastname    = b.lastname    || b.lastName;
    const phone       = b.phone       || b.phoneNumber;
    const dateofBirth = b.dateofBirth || b.dateOfBirth;
    const email       = b.email;
    const password    = b.password;
    const role        = b.role || "doctor";
    const clinic      = b.clinic || null;

    // ✅ Required nested address
    const address = b.address;
    if (
      !address ||
      !address.street ||
      !address.city ||
      !address.region ||
      !address.postalCode ||
      !address.country
    ) {
      return res.status(400).json({
        message:
          "Complete address is required: street, city, region, postalCode, country",
      });
    }

    // ✅ Basic field validation
    if (!firstname || !lastname || !phone || !dateofBirth || !email || !password) {
      return res
        .status(400)
        .json({ message: "Kindly input all required top-level fields" });
    }

    // ✅ Check for existing user
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    // ✅ Create user
    const user = await User.create({
      firstname,
      lastname,
      phone,
      dateofBirth,
      email,
      password,
      role,
      clinic,
      address, // passes straight to embedded schema
    });

    // ✅ Return token + created user (sans password)
    const token = generateToken(user._id, user.role);
    const safeUser = user.toObject();
    delete safeUser.password;

    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error("❌ createUser error:", err);   // full stack
    res.status(500).json({ message: err.message, stack: err.stack });
  }
};


export const editUser = async (req, res) => {
  const { id } = req.params;
  if (!req.body) return res.status(400).json({ message: "Missing request body" });
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
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
