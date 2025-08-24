import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import {
  createAppointment,
  getDoctorAppointments,
  getMarketerAppointments,
  decideAppointment,
  getAllAppointments,
  updateAppointment,
  deleteAppointment
} from "../controllers/appointmentController.js";

const router = express.Router();

// Marketer schedules appointment
router.post("/", protect, requireRole("marketer"), createAppointment);

// Doctor's appointments
router.get("/doctor", protect, requireRole("doctor"), getDoctorAppointments);

// Marketer's appointments
router.get("/marketer", protect, requireRole("marketer"), getMarketerAppointments);

// Doctor decides
router.post("/:appointmentId/decision", protect, requireRole("doctor"), decideAppointment);

// Admin sees all
router.get("/", protect, requireRole("admin"), getAllAppointments);

// Update appointment (marketer only)
router.put("/:id", protect, requireRole("marketer"), updateAppointment);

// Delete appointment (marketer only)
router.delete("/:id", protect, requireRole("marketer"), deleteAppointment);

export default router;
