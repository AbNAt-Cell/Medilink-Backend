import User from "../../models/userModel.js";
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
};


export const listUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

// controllers/authController.js (excerpt)
export const createUser = async (req, res) => {
  try {
    const {
      firstname, lastname, phone, dateofBirth,
      email, password, role, clinic // ✅ clinic id from frontend dropdown
    } = req.body;

    if (!firstname || !lastname || !phone || !dateofBirth || !email || !password) {
      return res.status(400).json({ message: "Kindly input all required fields" });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({
      firstname,
      lastname,
      phone,
      dateofBirth,
      email,
      password,
      role: role || "doctor",
      clinic: clinic || null      // ✅ store clinic reference
    });

    res.status(201).json({
      token: generateToken(user._id, user.role),
      user
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
