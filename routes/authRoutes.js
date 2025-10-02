import express from "express";
import {
  signup,
  login,
  me,
  searchMessagingUsers,
  getUserProfile,
  editProfile,
  searchUsers,
  requestPasswordReset,
  resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

// 🔄 Password reset routes (no auth required)
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

router.get("/me", protect, me);
router.get("/search", protect, searchUsers);

// ✅ fixed-path routes FIRST
router.put("/profile", protect, editProfile);
router.get("/messaging", protect, searchMessagingUsers);

// ✅ dynamic route LAST
router.get("/:userId", protect, getUserProfile);

export default router;