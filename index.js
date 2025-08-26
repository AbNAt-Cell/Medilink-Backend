import express from "express";
import mongoose from "mongoose";
import { createServer } from "http";
import authRoutes from "./routes/authRoutes.js";
import usersRoutes from "./routes/admin/usersCRUDRoute.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import formRoutes from "./routes/formRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import socketSetup from "./socket/socket.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const httpServer = createServer(app);

// ✅ Dynamic allowed origins from .env
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",")
  : ["http://localhost:3000", "https://f5tzn3-3000.csb.app"];

// ✅ Apply CORS properly
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// ✅ Setup Socket.IO with same CORS rules
socketSetup(httpServer);

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
