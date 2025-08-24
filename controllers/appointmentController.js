import Appointment from "../models/Appointments.js";
import Form from "../models/Form.js";


// Marketer schedules an appointment from an approved form

export const createAppointment = async (req, res) => {
  try {
    const { formId, date, time } = req.body;

    const form = await Form.findById(formId);
    if (!form) return res.status(404).json({ message: "Form not found" });
    if (form.status !== "approved") {
      return res.status(400).json({ message: "Form is yet to be approved" });
    }

    const appointment = await Appointment.create({
      form: formId,
      marketer: req.user._id,
      doctor: form.doctor,
      date,
      time
    });

    res.status(201).json(appointment);
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

// Update Appointment (Marketer only)
export const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // ensure marketer owns this appointment
    if (appointment.marketer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to edit this appointment" });
    }

    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating appointment:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//  Delete Appointment (Marketer only)
export const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // ensure marketer owns this appointment
    if (appointment.marketer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this appointment" });
    }

    await appointment.deleteOne();

    res.json({ message: "Appointment deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting appointment:", err);
    res.status(500).json({ message: "Server error" });
  }
};
