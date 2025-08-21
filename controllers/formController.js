import Form from "../models/Form.js";
import User from "../models/userModel.js";

/**
 * Marketer submits form for a doctor
 */
export const submitForm = async (req, res) => {
  try {
    const { clientName, details, doctorId, sex, age, appointmentDate, appointmentTime } = req.body;

    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(400).json({ message: "Invalid doctor" });
    }

    const form = await Form.create({
      clientName,
      details,
      sex, 
      age, 
      appointmentDate, 
      appointmentTime,
      marketer: req.user._id,
      doctor: doctorId
    });

    res.status(201).json(form);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Doctor sees only forms assigned to them
 */
export const getMyForms = async (req, res) => {
  try {
    const forms = await Form.find({ doctor: req.user._id }).populate("marketer", "name email");
    res.json(forms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Admin can view all forms
 */
export const getAllForms = async (req, res) => {
  try {
    const forms = await Form.find()
      .populate("marketer", "name email")
      .populate("doctor", "name email");
    res.json(forms);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Doctor approves/rejects a form
 */
export const decideForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const { decision } = req.body; // "approved" | "rejected"

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "Invalid decision" });
    }

    const form = await Form.findOne({ _id: formId, doctor: req.user._id });
    if (!form) return res.status(404).json({ message: "Form not found" });

    form.status = decision;
    await form.save();

    res.json(form);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
