import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { getDoctorStats } from "../controllers/statsController.js";

const router = express.Router();

router.get("/doctors", protect, requireRole("admin"), getDoctorStats);

export default router;
