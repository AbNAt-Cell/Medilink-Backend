import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

export const signup = async (req, res) => {
  try {
    if (!req.body.name || !req.body.email || !req.body.password || !req.body.role){
            return res.status(400).send({message: "Kindly input all required fields"})
          }

    const { name, email, password, role } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ name, email, password, role });
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

    res.json({ token: generateToken(user._id, user.role) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
