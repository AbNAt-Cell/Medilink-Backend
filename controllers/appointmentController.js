import Appointment from "../models/Appointments.js";
import { pushNotification } from "./notificationController.js";

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

// Doctor confirms/rejects appointment

export const decideAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { decision } = req.body; // "confirmed" | "rejected"

    if (!["confirmed", "rejected"].includes(decision)) {
      return res.status(400).json({ message: "Invalid decision" });
    }

    const appointment = await Appointment.findOne({
      _id: appointmentId,
      doctor: req.user._id
    });

    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    appointment.status = decision;
    await appointment.save();

    res.json(appointment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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
    const appt = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    // Notify doctor
    await pushNotification({
      userId: appt.doctor,
      type: "appointment",
      message: "✏️ An appointment you are assigned to has been updated.",
      link: `/appointments/${appt._id}`,
      io: req.io
    });

    res.json(appt);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

//  Delete appointment
export const deleteAppointment = async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    await Appointment.findByIdAndDelete(req.params.id);

    // Notify doctor
    await pushNotification({
      userId: appt.doctor,
      type: "appointment",
      message: "❌ An appointment you were assigned to has been cancelled.",
      link: `/appointments`,
      io: req.io
    });

    res.json({ message: "Appointment deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};