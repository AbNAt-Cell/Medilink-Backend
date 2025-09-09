import express from "express";
import { getPeerId } from "../controllers/peerController.js";

const router = express.Router();

router.get("/:userId", getPeerId);

export default router;
