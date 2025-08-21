import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { submitForm, getMyForms, getAllForms, decideForm } from "../controllers/formController.js";

const router = express.Router();

// Marketer submits form
router.post("/", protect, requireRole("marketer"), submitForm);

// Doctor sees their forms
router.get("/mine", protect, requireRole("doctor"), getMyForms);

// Admin sees all forms
router.get("/", protect, requireRole("admin"), getAllForms);

// Doctor approves/rejects
router.post("/:formId/decision", protect, requireRole("doctor"), decideForm);

export default router;
