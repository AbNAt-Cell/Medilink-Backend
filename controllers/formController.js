import Form from "../models/Form.js";
import Appointment from "../models/Appointments.js";
import Notification from "../models/Notifications.js";
import { getUserSocket } from "../socket/socket.js";
import User from "../models/userModel.js";
import { formatDate } from "../services/formatDate.js";

// ✅ Marketer submits a new form (creates Form + pending Appointment)
export const submitForm = async (req, res) => {
  try {
    const {
      clientName,
      clientEmail,
      clientPhone,
      description,
      sex,
      age,
      preferredDate,
      preferredTime
    } = req.body;

    if (!clientName || !description || !sex || !age || !preferredDate || !preferredTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 1️⃣ Create Form
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

    // 2️⃣ Create matching pending Appointment (doctor not yet assigned)
    let appointment = await Appointment.create({
      form: form._id,
      marketer: req.user._id,
      doctor: null,
      date: preferredDate,
      time: preferredTime,
      description,
      status: "pending"
    });

    // 👉 populate form inside appointment for immediate return
    appointment = await Appointment.findById(appointment._id)
      .populate("form")                         // include full form details
      .populate("marketer", "firstname lastname email");

    // 3️⃣ Notify all doctors
    const doctors = await User.find({ role: "doctor" }).select("_id");
    for (const doc of doctors) {
      const notif = await Notification.create({
        user: doc._id,
        type: "form",
        message: "🆕 New form/appointment available. Click to review.",
        link: `/forms/${form._id}`
      });
      const socketId = getUserSocket(doc._id);
      if (socketId && req.io) {
        req.io.to(socketId).emit("notification:new", notif);
      }
    }

    // Format date for response
    const responseForm = {
      ...form.toObject(),
      preferredDate: formatDate(form.preferredDate)
    };

    res.status(201).json({
      message: "Form submitted & pending appointment created",
      form: responseForm,
      appointment          // ✅ appointment now includes full form details
    });
  } catch (err) {
    console.error("❌ submitForm error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Doctor views form details
export const getFormById = async (req, res) => {
  try {
    const form = await Form.findById(req.params.formId)
      .populate("marketer", "firstname lastname email")
      .lean();

    if (!form) return res.status(404).json({ message: "Form not found" });

    form.preferredDate = formatDate(form.preferredDate);
    res.json(form);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Doctors fetch all unclaimed forms
export const getOpenForms = async (req, res) => {
  try {
    const forms = await Form.find({ status: "pending" })
      .populate("marketer", "firstname lastname email")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = forms.map((f) => ({
      ...f,
      preferredDate: formatDate(f.preferredDate)
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ getOpenForms error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Doctor accepts a form
export const acceptForm = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const { formId } = req.params;

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ message: "Form not found" });
    if (form.status !== "pending") {
      return res.status(400).json({ message: "Form already handled" });
    }

    form.status = "accepted";
    form.assignedDoctor = doctorId;
    await form.save();

    // Create appointment
    const appointment = await Appointment.create({
      doctor: doctorId,
      marketer: form.marketer,
      description: form.description,
      form: form._id,
      date: form.preferredDate,
      time: form.preferredTime,
      status: "scheduled"
    });

    // Notify doctor
    const doctorNotif = await Notification.create({
      user: doctorId,
      type: "appointment",
      message: "✅ You accepted a form. Appointment created.",
      link: `/appointments/${appointment._id}`
    });
    const doctorSocket = getUserSocket(doctorId);
    if (doctorSocket) req.io.to(doctorSocket).emit("notification:new", doctorNotif);

    // Notify marketer
    const marketerNotif = await Notification.create({
      user: form.marketer,
      type: "appointment",
      message: "📢 A doctor accepted your form. Appointment created.",
      link: `/appointments/${appointment._id}`
    });
    const marketerSocket = getUserSocket(form.marketer);
    if (marketerSocket) req.io.to(marketerSocket).emit("notification:new", marketerNotif);

    let responseAppointment = appointment.toObject();
    responseAppointment.date = formatDate(responseAppointment.date);

    res.json({ message: "Form accepted, appointment created", appointment: responseAppointment });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Doctor sees forms assigned to them
export const getDoctorForms = async (req, res) => {
  try {
    const forms = await Form.find({ assignedDoctor: req.user._id })
      .populate("marketer", "firstname lastname email")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = forms.map((f) => ({
      ...f,
      preferredDate: formatDate(f.preferredDate)
    }));

    res.json(formatted);
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
      .sort({ createdAt: -1 })
      .lean();

    const formatted = forms.map((f) => ({
      ...f,
      preferredDate: formatDate(f.preferredDate)
    }));

    res.json(formatted);
  } catch (err) {
    console.error("❌ getAllForms error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
