import Form from "../models/Form.js";
import Appointment from "../models/Appointments.js"; // if you want auto-create
import Notification from "../models/Notifications.js";
import { getUserSocket } from "../socket/socket.js";

// Marketer submits a new form
export const submitForm = async (req, res) => {
  try {
    const { clientName, clientEmail, clientPhone, description, sex, age, preferredDate, preferredTime } = req.body;

    // if (!clientName || !description || !sex || !age || !preferredDate || !preferredTime) {
    //   return res.status(400).json({ message: "Missing required fields" });
    // }

    const form = await Form.create({
      marketer: req.user._id,
      clientName,
      clientEmail,
      clientPhone,
      description,
      sex,
      age,
      preferredDate,
      preferredTime,
      status: "pending"
    });

    // Notify all doctors
    const notification = {
      type: "form",
      message: `📝 New form submitted by marketer`,
      link: `/forms/${form._id}`
    };

    if (req.io) {
      req.io.emit("notification:new", notification); // broadcast to all connected doctors
    }

    res.status(201).json(form);
  } catch (err) {
    console.error("❌ submitForm error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Doctor fetches single form details
export const getFormById = async (req, res) => {
  try {
    const { formId } = req.params;
    const form = await Form.findById(formId)
      .populate("marketer", "firstname lastname email");

    if (!form) return res.status(404).json({ message: "Form not found" });

    res.json(form);
  } catch (err) {
    console.error("❌ getFormById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Doctors fetch all unclaimed forms
export const getOpenForms = async (req, res) => {
  try {
    const forms = await Form.find({ status: "pending" })
      .populate("marketer", "firstname lastname email")
      .sort({ createdAt: -1 });

    res.json(forms);
  } catch (err) {
    console.error("❌ getOpenForms error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Doctor accepts a form
export const acceptForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const doctorId = req.user._id;

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ message: "Form not found" });
    if (form.status !== "pending") return res.status(400).json({ message: "Form already taken" });

    form.status = "accepted";
    form.assignedDoctor = doctorId;
    await form.save();

    // Auto-create appointment
    const appointment = await Appointment.create({
      doctor: doctorId,
      marketer: form.marketer,
      form: form._id,
      date: form.preferredDate,
      time: form.preferredTime,
      description: form.description
    });

    // Notify doctor
    await Notification.create({
      user: doctorId,
      type: "appointment",
      message: "✅ You accepted a form. Appointment scheduled.",
      link: `/appointments/${appointment._id}`
    });

    const doctorSocket = getUserSocket(doctorId);
    if (doctorSocket) req.io.to(doctorSocket).emit("notification:new", {
      type: "appointment",
      message: "✅ You accepted a form. Appointment scheduled.",
      link: `/appointments/${appointment._id}`,
      sound: true
    });

    // Notify marketer
    await Notification.create({
      user: form.marketer,
      type: "appointment",
      message: "📢 Your form was accepted by a doctor.",
      link: `/appointments/${appointment._id}`
    });

    const marketerSocket = getUserSocket(form.marketer);
    if (marketerSocket) req.io.to(marketerSocket).emit("notification:new", {
      type: "appointment",
      message: "📢 Your form was accepted by a doctor.",
      link: `/appointments/${appointment._id}`,
      sound: true
    });

    res.json({ message: "Form accepted and appointment created", appointment });
  } catch (err) {
    console.error("❌ acceptForm error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Doctor sees forms assigned to them
export const getDoctorForms = async (req, res) => {
  try {
    const forms = await Form.find({ assignedDoctor: req.user._id })
      .populate("marketer", "firstname lastname email")
      .sort({ createdAt: -1 });

    res.json(forms);
  } catch (err) {
    console.error("❌ getDoctorForms error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin sees all forms
export const getAllForms = async (req, res) => {
  try {
    const forms = await Form.find()
      .populate("marketer", "firstname lastname email")
      .populate("assignedDoctor", "firstname lastname email")
      .sort({ createdAt: -1 });

    res.json(forms);
  } catch (err) {
    console.error("❌ getAllForms error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
