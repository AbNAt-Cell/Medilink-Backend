import express from "express";
import { protect } from "../middleware/auth.js";
import { getMyConversations, startConversation, deleteConversation } from "../controllers/conversationController.js";

const router = express.Router();

// Start new conversation
router.post("/", protect, startConversation);

// Get logged-in user's conversations
router.get("/", protect, getMyConversations);

// Delete conversation
router.delete("/:conversationId", protect, deleteConversation);

export default router;
