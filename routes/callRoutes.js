// routes/callRoutes.js
import express from "express";
import { protect } from "../middleware/auth.js";
import { savePeerId, getPeerId } from "../controllers/callController.js";

const router = express.Router();

// Save peer ID
router.post("/peer", protect, savePeerId);

// Get peer ID for a user
router.get("/peer/:userId", protect, getPeerId);

export default router;
