import { formatDate } from "../services/formatDate.js";
import Appointment from "../models/Appointments.js";
import { getUserSocket } from "../socket/socket.js";
import Notification from "../models/Notifications.js";
import Form from "../models/Form.js";


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
      description,
      sex,
      age,
      date,
      time
    } = req.body;

    // Validation
    if (!clientName || !description || !date || !time) {
      return res.status(400).json({ message: "Missing required fields: clientName, description, date, time" });
    }

    // Parse date string if in dd/mm/yyyy format
    let parsedDate = date;
    if (typeof date === "string" && date.includes("/")) {
      const parts = date.split("/");
      if (parts.length === 3) {
        let [day, month, year] = parts;
        day = day.padStart(2, "0");
        month = month.padStart(2, "0");
        parsedDate = new Date(`${year}-${month}-${day}`);
        if (isNaN(parsedDate)) {
          return res.status(400).json({ message: "Invalid date format. Use dd/mm/yyyy." });
        }
      } else {
        return res.status(400).json({ message: "Invalid date format. Use dd/mm/yyyy." });
      }
    }

    // Step 1: Create Appointment directly (no Form)
    let appointment;
    try {
      appointment = await Appointment.create({
        doctor: doctorId,
        marketer: null,
        client: {
          name: clientName,
          email: clientEmail,
          phone: clientPhone,
          sex,
          age
        },
        date: parsedDate,
        time,
        description,
        status: "scheduled",
      });
    } catch (apptErr) {
      return res
        .status(500)
        .json({ message: "Error creating appointment", error: apptErr.message });
    }

    // Step 2: Notify Doctor (unchanged)
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

    // Step 3: Format and respond (same as before)
    const responseAppointment = appointment.toObject();
    responseAppointment.date = formatDate(responseAppointment.date);

    res.status(201).json({
      message: "Appointment created successfully",
      appointment: responseAppointment,
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

    // Parse date string if in dd/mm/yyyy format
    let parsedDate = date;
    if (typeof date === "string" && date.includes("/")) {
      const parts = date.split("/");
      if (parts.length === 3) {
        let [day, month, year] = parts;
        day = day.padStart(2, "0");
        month = month.padStart(2, "0");
        parsedDate = new Date(`${year}-${month}-${day}`);
        if (isNaN(parsedDate)) {
          return res.status(400).json({ message: "Invalid date format. Use dd/mm/yyyy." });
        }
      } else {
        return res.status(400).json({ message: "Invalid date format. Use dd/mm/yyyy." });
      }
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
      date: parsedDate,
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

    // Format response date
    const responseAppointment = appointment.toObject();
    responseAppointment.date = formatDate(responseAppointment.date);

    res.status(201).json({
      message: "Appointment created and marked as completed",
      appointment: responseAppointment
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
