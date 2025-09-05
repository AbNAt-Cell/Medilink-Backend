// routes/notificationRoutes.js
import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { getMyNotifications, markAsRead } from "../controllers/notificationController.js";

const router = express.Router();

// Doctor fetches their notifications
router.get("/", protect, getMyNotifications);

// Mark as read 
router.patch("/:id/read", protect, markAsRead);

// Mark all as read
// router.patch("/read/all", protect, requireRole("doctor"), markAllAsRead);

export default router;
