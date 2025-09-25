import express from "express";
import { protect, requireRole } from "../../middleware/auth.js";
import { listUsers, createUser, editUser, deleteUser } from "../../controllers/admin/userCRUDContoller.js";

const router = express.Router();

// Admin-only
router.get("/", protect, requireRole("admin"), listUsers);
router.post("/", protect, createUser);
router.put("/:id", protect, requireRole("admin"), editUser);
router.delete("/:id", protect, requireRole("admin"), deleteUser);

export default router;
