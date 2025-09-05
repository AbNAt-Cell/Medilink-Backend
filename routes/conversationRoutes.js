import express from "express";
import { protect } from "../middleware/auth.js";
import { getMyConversations, startConversation } from "../controllers/conversationController.js";

const router = express.Router();

// Start new conversation
router.post("/", protect, startConversation);

// Get logged-in user's conversations
router.get("/", protect, getMyConversations);


export default router;
