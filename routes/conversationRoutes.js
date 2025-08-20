import express from "express";
import { protect } from "../middleware/auth.js";
import { createConversation, getConversations } from "../controllers/conversationController.js";

const router = express.Router();

router.post("/", protect, createConversation);
router.get("/", protect, getConversations);

export default router;
