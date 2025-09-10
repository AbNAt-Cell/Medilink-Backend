import Appointment from "../models/Appointments.js";
import { getUserSocket } from "../socket/socket.js";
import Form from "../models/Form.js";

export const createAppointment = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const {
      clientName,
      clientEmail,
      clientPhone,
      details,
      sex,
      age,
      date,
      time
    } = req.body;

    // Validate required fields
    if (!clientName || !details || !sex || !age || !date || !time) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Step 1: Create a Form (as though marketer submitted it)
    const form = await Form.create({
      marketer: null, // since no marketer, it's doctor-submitted
      clientName,
      clientEmail,
      clientPhone,
      details,
      sex,
      age,
      preferredDate: date,
      preferredTime: time,
      status: "accepted", // doctor is already accepting it
      assignedDoctor: doctorId
    });

    // ✅ Step 2: Create Appointment linked to form
    const appointment = await Appointment.create({
      doctor: doctorId,
      marketer: null,
      form: form._id,
      date,
      time,
      description: details,
      status: "scheduled"
    });

    // ✅ Step 3: Create a notification for the doctor (for confirmation UX)
    await Notification.create({
      user: doctorId,
      type: "appointment",
      message: "📅 You created a new appointment.",
      link: `/appointments/${appointment._id}`
    });

    // Optionally push via Socket.IO
    const doctorSocket = getUserSocket(doctorId);
    if (doctorSocket && req.io) {
      req.io.to(doctorSocket).emit("notification:new", {
        message: "📅 You created a new appointment.",
        appointment
      });
    }

    res.status(201).json({
      message: "Appointment created and synced with form",
      appointment,
      form
    });
  } catch (err) {
    console.error("❌ Create appointment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Doctor gets their appointments

export const getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctor: req.user._id })
      .populate("form")
      .populate("marketer", "name email");
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Marketer gets their appointments

export const getMarketerAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ marketer: req.user._id })
      .populate("form")
      .populate("doctor", "name email");
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// // Doctor confirms/rejects appointment

// export const decideAppointment = async (req, res) => {
//   try {
//     const { appointmentId } = req.params;
//     const { decision } = req.body; // "confirmed" | "rejected"

//     if (!["confirmed", "rejected"].includes(decision)) {
//       return res.status(400).json({ message: "Invalid decision" });
//     }

//     const appointment = await Appointment.findOne({
//       _id: appointmentId,
//       doctor: req.user._id
//     });

//     if (!appointment) return res.status(404).json({ message: "Appointment not found" });

//     appointment.status = decision;
//     await appointment.save();

//     res.json(appointment);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

// Admin can see all appointments

export const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("form")
      .populate("marketer", "name email")
      .populate("doctor", "name email");
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get appointment details + form details
export const getAppointmentDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId)
      .populate("doctor", "firstname lastname email role")
      .populate("marketer", "firstname lastname email role")
      .populate("form"); // include form details

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json(appointment);
  } catch (err) {
    console.error("❌ Get appointment details error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Edit appointment
export const editAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const updates = req.body;

    const appointment = await Appointment.findByIdAndUpdate(appointmentId, updates, { new: true });
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    // Notify doctor + marketer
    const users = [appointment.doctor, appointment.marketer];
    for (let userId of users) {
      const notif = await Notification.create({
        user: userId,
        type: "appointment",
        message: "✏️ Appointment was updated.",
        link: `/appointments/${appointment._id}`
      });
      const socketId = getUserSocket(userId);
      if (socketId) req.io.to(socketId).emit("notification:new", notif);
    }

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete appointment
export const deleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findByIdAndDelete(appointmentId);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    // Notify doctor + marketer
    const users = [appointment.doctor, appointment.marketer];
    for (let userId of users) {
      const notif = await Notification.create({
        user: userId,
        type: "appointment",
        message: "❌ Appointment was cancelled.",
        link: `/appointments`
      });
      const socketId = getUserSocket(userId);
      if (socketId) req.io.to(socketId).emit("notification:new", notif);
    }

    res.json({ message: "Appointment deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};