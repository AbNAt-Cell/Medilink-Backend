// routes/notificationRoutes.js
import express from "express";
import { protect, requireRole } from "../middleware/auth.js";
import { getMyNotifications, markAsRead, markAllAsRead } from "../controllers/notificationController.js";

const router = express.Router();

// Doctor fetches their notifications
router.get("/", protect, requireRole("doctor"), getMyNotifications);

// Mark as read 
router.patch("/:id/read", protect, requireRole("doctor"), markAsRead);

// Mark all as read
router.patch("/read/all", protect, requireRole("doctor"), markAllAsRead);

export default router;
