import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { uploadSignature } from "../controllers/signatureController.js";

const router = express.Router();

// Only doctors can upload signature
router.post("/upload", protect, requireRole("doctor"), uploadSignature);

export default router;
