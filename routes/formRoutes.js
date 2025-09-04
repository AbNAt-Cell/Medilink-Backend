import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import {
  submitForm,
  getFormById,
  getOpenForms,
  acceptForm,
  getDoctorForms,
  getAllForms
} from "../controllers/formController.js";

const router = express.Router();

// Marketer submits a new form
router.post("/", protect, requireRole("marketer"), submitForm);

// Doctor fetches single form details
router.get("/:formId", protect, requireRole("doctor"), getFormById);

// Doctors fetch all unclaimed forms
router.get("/open/all", protect, requireRole("doctor"), getOpenForms);

// Doctor accepts a form
router.post("/:formId/accept", protect, requireRole("doctor"), acceptForm);

// Doctor sees forms assigned to them
router.get("/mine/all", protect, requireRole("doctor"), getDoctorForms);

// Admin sees all forms
router.get("/", protect, requireRole("admin"), getAllForms);

export default router;
