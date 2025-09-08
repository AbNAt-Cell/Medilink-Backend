import Appointment from "../models/Appointments.js";
import { getUserSocket } from "../socket/socket.js";

// Doctor creates an appointment manually
export const createAppointment = async (req, res) => {
  try {
    const doctorId = req.user._id;

    const { marketer, date, time, description } = req.body;

    if (!description || !date || !time) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const appointment = await Appointment.create({
      doctor: doctorId,
      marketer: marketer || null,
      date,
      time,
      description,
      status: "scheduled"
    });

    res.status(201).json({ message: "Appointment created", appointment });
  } catch (err) {
    res.status(500).json({ message: err.message });
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