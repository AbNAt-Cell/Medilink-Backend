import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { 
  uploadSignature, 
  updateSignature, 
  deleteSignature 
} from "../controllers/signatureController.js";

const router = express.Router();

// Both doctors and marketers can manage signatures
router.post("/upload", protect, requireRole("doctor", "marketer"), uploadSignature);
router.patch("/update", protect, requireRole("doctor", "marketer"), updateSignature);
router.delete("/delete", protect, requireRole("doctor", "marketer"), deleteSignature);

export default router;
