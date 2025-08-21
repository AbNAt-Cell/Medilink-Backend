import User from "../../models/userModel.js";

export const listUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

export const createUser = async (req, res) => {
  if (!req.body) return res.status(400).json({ message: "Missing request body" });
  const { lastname, firstname, dateofBirth, phone, email, password, role } = req.body;
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ message: "Email already exists" });

  const user = await User.create({ lastname, firstname, dateofBirth, phone, email, password, role });
  res.status(201).json({
    id: user._id,
    lastname: user.lastname,
    firstname: user.firstname,
    email: user.email,
    role: user.role,
    dateofBirth: user.dateofBirth,
    phone: user.phone,
    
  });
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
