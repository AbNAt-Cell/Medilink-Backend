import { formatDate } from "../services/formatDate.js";
import Appointment from "../models/Appointments.js";
import { getUserSocket } from "../socket/socket.js";
import Notification from "../models/Notifications.js";
import Form from "../models/Form.js";

// Doctor creates an appointment manually
export const createAppointment = async (req, res) => {
  try {
    
    const doctorId = req.user?._id;
    if (!doctorId) {
      return res.status(401).json({ message: "Unauthorized: No doctorId" });
    }

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

    // if (!clientName || !details || !sex || !age || !date || !time) {
    //   return res
    //     .status(400)
    //     .json({ message: "Missing required fields" });
    // }


    // Step 1: Create Form
    let form;
    try {
      form = await Form.create({
        marketer: null,
        clientName,
        clientEmail,
        clientPhone,
        details,
        sex,
        age,
        preferredDate: date, // ✅ real Date object
        preferredTime: time,
        status: "accepted",
        assignedDoctor: doctorId,
      });
    } catch (formErr) {
      return res
        .status(500)
        .json({ message: "Error creating form", error: formErr.message });
    }

    // Step 2: Create Appointment
    let appointment;
    try {
      appointment = await Appointment.create({
        doctor: doctorId,
        marketer: null,
        form: form._id,
        date, 
        time,
        description: details,
        status: "scheduled",
      });
    } catch (apptErr) {
      return res
        .status(500)
        .json({ message: "Error creating appointment", error: apptErr.message });
    }

    // Step 3: Notify Doctor
    try {
      await Notification.create({
        user: doctorId,
        type: "appointment",
        message: "📅 You created a new appointment.",
        link: `/appointments/${appointment._id}`,
      });

      const doctorSocket = getUserSocket(doctorId);
      if (doctorSocket && req.io) {
        req.io.to(doctorSocket).emit("notification:new", {
          message: "📅 You created a new appointment.",
          appointment,
        });
      }
    } catch (notifErr) {
      console.error("Notification error:", notifErr);
    }

    // Format response dates for display
    const responseAppointment = appointment.toObject();
    responseAppointment.date = formatDate(responseAppointment.date);

    const responseForm = form.toObject();
    responseForm.preferredDate = formatDate(responseForm.preferredDate);

    res.status(201).json({
      message: "Appointment created and synced with form",
      appointment: responseAppointment,
      form: responseForm,
    });
  } catch (err) {
    console.error("Create appointment error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const marketerCreateCompletedAppointment = async (req, res) => {
  try {
    // marketer is the logged-in user
    const marketerId = req.user._id;
    const {
      clientName,
      clientEmail,
      clientPhone,
      sex,
      age,
      date,
      time,
      description,
      doctor // optional
    } = req.body;

    if (!clientName || !date || !time || !description) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const appointment = await Appointment.create({
      marketer: marketerId,
      doctor: doctor || null,
      client: {
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        sex,
        age
      },
      date,
      time,
      description,
      status: "completed"
    });

    // ✅ Notify doctor if one was provided
    if (doctor) {
      const notif = await Notification.create({
        user: doctor,
        type: "appointment",
        message: `🆕 New completed appointment from marketer`,
        link: `/appointments/${appointment._id}`
      });
      const socketId = getUserSocket(doctor);
      if (socketId) req.io?.to(socketId).emit("notification:new", notif);
    }

    res.status(201).json({
      message: "Appointment created and marked as completed",
      appointment
    });
  } catch (err) {
    console.error("❌ marketerCreateCompletedAppointment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Doctor gets their appointments
export const getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      $or: [
        { doctor: req.user._id },
        { doctor: null }  // ✅ include pending
      ]
    })
      .populate("form")
      .populate("marketer", "name email")
      .lean();

    const formatted = appointments.map((a) => ({
      ...a,
      date: formatDate(a.date)
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Marketer gets their appointments
export const getMarketerAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ marketer: req.user._id })
      .populate("form")
      .populate("doctor", "name email")
      .lean();

    const formatted = appointments.map((a) => ({
      ...a,
      date: formatDate(a.date)
    }));

    res.json(formatted);
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
      .populate("doctor", "name email")
      .lean();

    const formatted = appointments.map((a) => ({
      ...a,
      date: formatDate(a.date)
    }));

    res.json(formatted);
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
      .populate("form")
      .lean();

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    appointment.date = formatDate(appointment.date);
    if (appointment.form?.preferredDate) {
      appointment.form.preferredDate = formatDate(appointment.form.preferredDate);
    }

    res.json(appointment);
  } catch (err) {
    console.error("❌ Get appointment details error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Doctor updates appointment with comment + signature
export const submitAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { assessment, doctorSignatureUrl } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Only the assigned doctor can submit
    if (appointment.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update fields
    appointment.assessment = assessment;
    appointment.doctorSignatureUrl = doctorSignatureUrl || req.user.signatureUrl; // fallback to stored signature
    appointment.status = "submitted";

    await appointment.save();

    // Notify marketer + admin
    await Notification.create({
      user: appointment.marketer,
      type: "appointment",
      message: "📋 Appointment has been submitted by the doctor.",
      link: `/appointments/${appointment._id}`
    });

    // Socket push
    const marketerSocket = getUserSocket(appointment.marketer);
    if (marketerSocket) {
      req.io.to(marketerSocket).emit("notification:new", {
        message: "📋 Appointment submitted by doctor",
        appointment
      });
    }

    res.json({ message: "Appointment submitted successfully", appointment });
  } catch (err) {
    console.error("❌ Submit appointment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Edit appointment
export const editAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const updates = req.body;

    const appointment = await Appointment.findByIdAndUpdate(appointmentId, updates, { new: true }).lean();
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    appointment.date = formatDate(appointment.date);

    // Notify doctor + marketer
    const users = [appointment.doctor, appointment.marketer];
    for (let userId of users) {
      if (!userId) continue;
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
      if (!userId) continue;
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
