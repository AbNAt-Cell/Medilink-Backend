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

// ✅ Doctor completes appointment with assessment + signature
export const completeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { assessment, doctorSignatureUrl } = req.body;

    console.log("🔄 completeAppointment - Appointment ID:", appointmentId);
    console.log("🔄 completeAppointment - Request body:", { assessment, doctorSignatureUrl });

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    // Any doctor can complete any appointment (no restriction)
    // Or you can add role-based restriction if needed
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ message: "Only doctors can complete appointments" });
    }

    // Update appointment with assessment and signature
    appointment.assessment = assessment;
    appointment.doctorSignatureUrl = doctorSignatureUrl || req.user.signatureUrl;
    appointment.status = "submitted"; // Change status to completed instead of submitted

    
    await appointment.save();


    // Optional: Notify relevant parties about completion
    const notificationMessage = "✅ Appointment has been completed by the doctor.";
    
    // Notify marketer if exists
    if (appointment.marketer) {
      try {
        await Notification.create({
          user: appointment.marketer,
          type: "appointment",
          message: notificationMessage,
          link: `/appointments/${appointment._id}`
        });

        const marketerSocket = getUserSocket(appointment.marketer);
        if (marketerSocket && req.io) {
          req.io.to(marketerSocket).emit("notification:new", {
            message: notificationMessage,
            appointment
          });
        }
      } catch (notifErr) {
        console.error("⚠️ Marketer notification error:", notifErr);
      }
    }

    // Notify appointment creator if different from current doctor
    if (appointment.doctor && appointment.doctor.toString() !== req.user._id.toString()) {
      try {
        await Notification.create({
          user: appointment.doctor,
          type: "appointment", 
          message: notificationMessage,
          link: `/appointments/${appointment._id}`
        });

        const doctorSocket = getUserSocket(appointment.doctor);
        if (doctorSocket && req.io) {
          req.io.to(doctorSocket).emit("notification:new", {
            message: notificationMessage,
            appointment
          });
        }
      } catch (notifErr) {
        console.error("⚠️ Doctor notification error:", notifErr);
      }
    }

    res.json({ 
      message: "Appointment completed successfully", 
      appointment: {
        ...appointment.toObject(),
        date: formatDate(appointment.date)
      }
    });
  } catch (err) {
    console.error("❌ Complete appointment error:", err);
    res.status(500).json({ 
      message: "Server error", 
      error: err.message 
    });
  }
};

// Edit appointment
export const editAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Handle legacy client field format (clientName, clientEmail, etc.) - convert to client object
    if (updates.clientName || updates.clientEmail || updates.clientPhone || updates.sex || updates.age) {
      console.log("🔄 Converting legacy client fields to client object");
      
      // Get current appointment to preserve existing client data
      const currentAppointment = await Appointment.findById(id).lean();
      if (!currentAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }

      // Build client object, preserving existing values if new ones aren't provided
      updates.client = {
        name: updates.clientName || currentAppointment.client?.name,
        email: updates.clientEmail || currentAppointment.client?.email,
        phone: updates.clientPhone || currentAppointment.client?.phone,
        sex: updates.sex || currentAppointment.client?.sex,
        age: updates.age || currentAppointment.client?.age
      };

      // Remove legacy fields from updates
      delete updates.clientName;
      delete updates.clientEmail; 
      delete updates.clientPhone;
      delete updates.sex;
      delete updates.age;

      console.log("🔄 Converted client object:", updates.client);
    }

    // Validate client object if provided
    if (updates.client) {
      if (typeof updates.client !== 'object' || Array.isArray(updates.client)) {
        return res.status(400).json({ 
          message: "Invalid client format. Client must be an object.",
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
    }

    // Handle date parsing if provided
    if (updates.date && typeof updates.date === "string" && updates.date.includes("/")) {
      const parts = updates.date.split("/");
      if (parts.length === 3) {
        let [day, month, year] = parts;
        day = day.padStart(2, "0");
        month = month.padStart(2, "0");
        updates.date = new Date(`${year}-${month}-${day}`);
        if (isNaN(updates.date)) {
          return res.status(400).json({ message: "Invalid date format. Use dd/mm/yyyy." });
        }
      }
    }
    
    const appointment = await Appointment.findByIdAndUpdate(
      id, 
      updates, 
      { 
        new: true, 
        runValidators: true  // ✅ Ensure validations run
      }
    ).lean();

    if (!appointment) {
      console.log("❌ Appointment not found with ID:", id);
      return res.status(404).json({ message: "Appointment not found" });
    }

    console.log("✅ Appointment updated successfully:", appointment._id);

    // Format date for response
    appointment.date = formatDate(appointment.date);

    // Notify doctor + marketer
    const users = [appointment.doctor, appointment.marketer].filter(Boolean);
    for (let userId of users) {
      try {
        const notif = await Notification.create({
          user: userId,
          type: "appointment", 
          message: "✏️ Appointment was updated.",
          link: `/appointments/${appointment._id}`
        });
        const socketId = getUserSocket(userId);
        if (socketId && req.io) {
          req.io.to(socketId).emit("notification:new", notif);
        }
      } catch (notifErr) {
        console.error("⚠️ Notification error:", notifErr);
      }
    }

    res.json({ 
      message: "Appointment updated successfully",
      appointment 
    });
  } catch (err) {
    console.error("❌ editAppointment error:", err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ 
        message: "Validation error", 
        errors 
      });
    }

    // Handle cast errors
    if (err.name === 'CastError') {
      return res.status(400).json({ 
        message: `Invalid ${err.path}: ${err.value}` 
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
