import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import {
  createAppointment,
  getDoctorAppointments,
  getMarketerAppointments,
  decideAppointment,
  getAllAppointments
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

export default router;
