import express from "express";
import mongoose from "mongoose";
import { createServer } from "http";
import authRoutes from "./routes/authRoutes.js";
import usersRoutes from "./routes/admin/usersCRUDRoute.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import formRoutes from "./routes/formRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import socketSetup from "./socket/socket.js";
import startReminderService from "./services/reminderService.js";
import cors from "cors";
import { corsOptions } from "./cors.js";
import dotenv from "dotenv";  

dotenv.config();

const app = express();
const httpServer = createServer(app);


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));

// Health check
app.get("/health", (req, res) => res.status(200).json({ message: "ok" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/forms", formRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/notifications", notificationRoutes);

// Setup Socket.IO with same CORS rules
socketSetup(httpServer);
const io = socketSetup(httpServer);
startReminderService(io);

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => {
    // ✅ Run httpServer instead of app.listen
    httpServer.listen(process.env.PORT, () => {
      console.log(`🚀 Server + Socket.IO running on ${process.env.PORT}`);
    });
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.log("❌ DB connection failed", err);
  });
