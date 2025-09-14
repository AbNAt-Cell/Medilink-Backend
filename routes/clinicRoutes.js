import express from "express";
import {
  updateClinic,
  deleteClinic,
  registerClinic,
  getClinics,
  getClinic,
} from "../controllers/clinicController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// public
router.get("/", getClinics);
router.get("/:id", getClinic);

// private
router.post("/", protect, registerClinic);
router.put("/:id", protect, updateClinic);
router.delete("/:id", protect, deleteClinic);

export default router;
