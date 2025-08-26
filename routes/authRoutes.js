import express from "express";
import { signup, login, me } from "../controllers/authController.js";
import { searchUsers } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", protect, me);
router.get("/search", protect, searchUsers);


export default router;
