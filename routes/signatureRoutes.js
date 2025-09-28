import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { 
  uploadSignature, 
  updateSignature, 
  deleteSignature 
} from "../controllers/signatureController.js";

const router = express.Router();

// Only doctors can manage signatures
router.post("/upload", protect, requireRole("doctor"), uploadSignature);
router.patch("/update", protect, requireRole("doctor"), updateSignature);
router.delete("/delete", protect, requireRole("doctor"), deleteSignature);

export default router;
