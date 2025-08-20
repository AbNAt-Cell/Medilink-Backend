import express from "express";
import { protect } from "../middleware/auth.js";
import { sendMessage, getMessages, markAsRead } from "../controllers/messageController.js";

const router = express.Router();

router.post("/", protect, sendMessage);
router.get("/:conversationId", protect, getMessages);
router.post("/:conversationId/read", protect, markAsRead);

export default router;
