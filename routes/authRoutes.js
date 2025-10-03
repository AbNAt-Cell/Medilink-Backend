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
  changePassword,
  setUserOnlineStatus
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);

// 🔄 Password reset routes (no auth required)
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);

// 🔐 Change password route (requires authentication)
router.post("/changepassword", protect, changePassword);

router.get("/me", protect, me);
router.get("/search", protect, searchUsers);

// 🧪 Testing route for online status
router.post("/test/online-status", protect, setUserOnlineStatus);
// router.get("/debug/online-users", protect, getOnlineUsersDebug);

// ✅ fixed-path routes FIRST
router.put("/profile", protect, editProfile);
router.get("/messaging", protect, searchMessagingUsers);

// ✅ dynamic route LAST
router.get("/:userId", protect, getUserProfile);

export default router;