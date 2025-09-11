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
  submitAppointment
} from "../controllers/appointmentController.js";


const router = express.Router();

// Doctor creates an appointment
router.post("/doctor", protect, requireRole("doctor"), createAppointment);
// Doctor's appointments
router.get("/doctor", protect, requireRole("doctor"), getDoctorAppointments);

// Marketer's appointments
router.get("/marketer", protect, requireRole("marketer"), getMarketerAppointments);

router.get("/:appointmentId", protect, getAppointmentDetails);

//  Doctor submits appointment with comment + signature
router.patch("/:appointmentId/submit", protect, requireRole("doctor"), submitAppointment);

// Admin sees all
router.get("/", protect, requireRole("admin"), getAllAppointments);

// Update appointment (marketer only)
router.put("/:id", protect, requireRole("marketer"), editAppointment);

// Delete appointment (marketer only)
router.delete("/:id", protect, requireRole("marketer"), deleteAppointment);

export default router;
