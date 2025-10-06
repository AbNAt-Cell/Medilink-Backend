import { formatDate } from "../services/formatDate.js";
import Appointment from "../models/Appointments.js";
import { getUserSocket } from "../socket/socket.js";
import Notification from "../models/Notifications.js";


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
      address,
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
        address,
        time,
        description,
        status: "pending",
        createdBy: {
          user: doctorId,
          name: `${req.user.firstname} ${req.user.lastname}`,
          email: req.user.email,
          role: req.user.role
        }
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

    // Step 3: Format and respond
    const responseAppointment = await Appointment.findById(appointment._id)
      .populate("doctor", "_id firstname lastname email")
      .populate("marketer", "_id firstname lastname email")
      .lean();
    
    responseAppointment.date = formatDate(responseAppointment.date);

    res.status(201).json({
      message: "Appointment created successfully",
      appointment: responseAppointment
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
    const creator = req.user.firstname + " " + req.user.lastname;
  
    const {
      clientName,
      clientEmail,
      clientPhone,
      sex,
      address,
      age,
      date,
      time,
      description,
      doctor // optional
    } = req.body;

    if (!clientName || !date || !time) {
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

    // Create appointment with very simple structure
    const appointment = await Appointment.create({
      marketer: marketerId,
      createdby: creator,
      doctor: doctor || null,
      client: {
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        sex,
        age
      },
      date: parsedDate,
      address,
      time,
      description,
      status: "review"
    
    });

    // ✅ Notify doctor if one was provided
    if (doctor) {
      const notif = await Notification.create({
        user: doctor,
        type: "appointment",
        message: `🆕 New review appointment from marketer`,
        link: `/appointments/${appointment._id}`
      });
      const socketId = getUserSocket(doctor);
      if (socketId) req.io?.to(socketId).emit("notification:new", notif);
    }

    // Format response date and populate
    const responseAppointment = await Appointment.findById(appointment._id)
      .populate("marketer", "_id firstname lastname email")
      .populate("doctor", "_id firstname lastname email")
      .lean();
    
    responseAppointment.date = formatDate(responseAppointment.date);

    console.log("📋 Response appointment createdBy:", responseAppointment.createdBy);

    res.status(201).json({
      message: "Appointment created and marked for review",
      appointment: responseAppointment,
      createdBy: `${req.user.firstname} ${req.user.lastname}`
    });
  } catch (err) {
    console.error("❌ marketerCreateReviewAppointment error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Doctor gets their appointments
export const getDoctorAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctor: req.user._id  // ✅ only appointments assigned to this doctor
    })
      .populate("marketer", "firstname lastname email")
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

// Get appointments for a specific doctor by ID (admin/marketer can use this)
export const getAppointmentsByDoctorId = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    const appointments = await Appointment.find({
      doctor: doctorId
    })
      .populate("marketer", "firstname lastname email")
      .populate("doctor", "firstname lastname email")
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
      .populate("doctor", "firstname lastname email")
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
    console.log("🔍 Fetching all appointments...");

    const appointments = await Appointment.find()
      .populate("marketer", "_id firstname lastname email")
      .populate("doctor", "_id firstname lastname email");

    console.log(`📊 Found ${appointments.length} appointments`);

    const formatted = appointments.map((a) => {
      const appointment = a.toObject(); // Convert to plain object
      
      return {
        ...appointment,
        date: formatDate(appointment.date)
      };
    });

    console.log("✅ Sending formatted appointments response");
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

    // Handle client field validation - prevent casting errors
    if (updates.client && typeof updates.client === 'string') {
      console.log("⚠️ Warning: Received string value for client field, expected object. Skipping client update.");
      delete updates.client;
    }

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
    console.error("❌ editAppointment error:", err);
    
    // Handle client casting errors specifically
    if (err.message && err.message.includes("Cast to Embedded failed")) {
      return res.status(400).json({ 
        message: "Invalid client format. Client must be an object with properties like name, email, phone, etc.", 
        example: {
          client: {
            name: "John Doe",
            email: "john@email.com",
            phone: "+1234567890",
            sex: "male",
            age: 30
          }
        }
      });
    }

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        message: "Validation error", 
        errors 
      });
    }

    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Delete appointment
export const deleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    const appointment = await Appointment.findByIdAndDelete(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.json({ message: "Appointment deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
