import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import {
  getDoctorAppointments,
  getMarketerAppointments,
  // decideAppointment,
  getAllAppointments,
  editAppointment,
  deleteAppointment,
  createAppointment,
  getAppointmentDetails,
  submitAppointment,
  marketerCreateCompletedAppointment,
  getAppointmentsByDoctorId
} from "../controllers/appointmentController.js";


const router = express.Router();

// Doctor creates an appointment
router.post("/doctor", protect, requireRole("doctor"), createAppointment);
// Doctor's appointments
router.get("/doctor", protect, requireRole("doctor"), getDoctorAppointments);

router.post(
  "/marketer",
  protect,
  requireRole("marketer"),
  marketerCreateCompletedAppointment
);

// Marketer's appointments
router.get("/marketer", protect, requireRole("marketer"), getMarketerAppointments);

//  Doctor submits appointment with comment + signature
router.patch("/:appointmentId/submit", protect, requireRole("doctor"), submitAppointment);

// Admin sees all
router.get("/", protect, requireRole("admin"), getAllAppointments);

// Get specific appointment details
router.get("/:appointmentId", protect, getAppointmentDetails);

// Get appointments for a specific doctor by ID
router.get("/doctor/:doctorId", protect, getAppointmentsByDoctorId);

// Update appointment
router.put("/:id", protect, editAppointment);

// Delete appointment (basic deletion)
router.delete("/:appointmentId", protect, deleteAppointment);

export default router;
