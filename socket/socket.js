import { Server } from "socket.io";
import Message from "../models/messages.js";
import Conversation from "../models/Conversation.js";
import User from "../models/userModel.js";
import Form from "../models/Form.js";   
import Notification from "../models/Notifications.js";  
import dotenv from "dotenv";

dotenv.config();

// Keep a map of connected users { userId: { socketId, peerId? } }
const onlineUsers = new Map();

export default function socketSetup(httpServer) {
  const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",")
    : [
        "http://localhost:3000",
        "https://d76kqh-3000.csb.app",
        "https://codesandbox.io"
      ];

  const io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowed list or contains allowed domains
        const isAllowed = allowedOrigins.some(allowed => 
          origin === allowed || 
          origin.includes('csb.app') || 
          origin.includes('codesandbox.io') ||
          origin.includes('localhost')
        );
        
        if (isAllowed) {
          callback(null, true);
        } else {
          console.error("❌ Socket CORS blocked:", origin);
          callback(new Error("Not allowed by CORS"));
        }
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      optionsSuccessStatus: 200
    }
  });

  io.on("connection", (socket) => {
    console.log("⚡ New client connected", socket.id);

    // -----------------------------
    // User joins
    // -----------------------------
    socket.on("join", (userId) => {
      const existing = onlineUsers.get(userId) || {};
      onlineUsers.set(userId, { ...existing, socketId: socket.id });
      io.emit("user:online", { userId });
      console.log(`✅ User ${userId} connected`);
    });

    // -----------------------------
    // Peer ID registration for audio/video
    // -----------------------------
    socket.on("peer:id", ({ userId, peerId }) => {
      const existing = onlineUsers.get(userId) || {};
      onlineUsers.set(userId, { ...existing, peerId });
      io.emit("peer:available", { userId, peerId });
      console.log(`✅ User ${userId} registered with Peer ID: ${peerId}`);
    });

    // -----------------------------
    // Messaging
    // -----------------------------
    socket.on("message:send", async ({ conversationId, senderId, text }) => {
      try {
        const message = await Message.create({
          conversation: conversationId,
          sender: senderId,
          text,
          readBy: [senderId]
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: text,
          updatedAt: new Date()
        });

        const populated = await message.populate("sender", "name email role");

        const conv = await Conversation.findById(conversationId).lean();
        conv.participants.forEach((participantId) => {
          const user = onlineUsers.get(participantId.toString());
          if (user?.socketId) {
            io.to(user.socketId).emit("message:new", populated);
          }
        });
      } catch (err) {
        console.error("❌ Socket message error:", err);
      }
    });

    socket.on("message:read", async ({ conversationId, userId }) => {
      try {
        await Message.updateMany(
          { conversation: conversationId, readBy: { $ne: userId } },
          { $push: { readBy: userId } }
        );

        const conv = await Conversation.findById(conversationId).lean();
        conv.participants.forEach((participantId) => {
          const user = onlineUsers.get(participantId.toString());
          if (user?.socketId) {
            io.to(user.socketId).emit("message:read:update", {
              conversationId,
              userId
            });
          }
        });
      } catch (err) {
        console.error("❌ Mark as read error:", err);
      }
    });

    // -----------------------------
    // WebRTC placeholders (optional)
    // -----------------------------
    socket.on("call:offer", (data) => {
      socket.broadcast.emit("call:offer", data);
    });

    socket.on("call:answer", (data) => {
      socket.broadcast.emit("call:answer", data);
    });

    // -----------------------------
    // Disconnect
    // -----------------------------
    socket.on("disconnect", () => {
      for (let [userId, user] of onlineUsers.entries()) {
        if (user.socketId === socket.id) {
          onlineUsers.delete(userId);
          io.emit("user:offline", { userId });
          console.log(`❌ User ${userId} disconnected`);
        }
      }
    });
  });

  // -----------------------------
  // Reminder system
  // -----------------------------
  setInterval(async () => {
    try {
      const pendingForms = await Form.find({ status: "pending" });
      if (pendingForms.length > 0) {
        const doctors = await User.find({ role: "doctor" }).select("_id");

        for (let doc of doctors) {
          const existing = await Notification.findOne({
            user: doc._id,
            type: "reminder",
            status: "unread"
          });

          if (!existing) {
            await Notification.create({
              user: doc._id,
              type: "reminder",
              message: `⏰ You have ${pendingForms.length} unclaimed forms waiting`,
              status: "unread"
            });
          }

          const user = onlineUsers.get(doc._id.toString());
          if (user?.socketId) {
            io.to(user.socketId).emit("notification:reminder", {
              message: "⏰ You have unclaimed forms waiting",
              count: pendingForms.length
            });
          }
        }
      }
    } catch (err) {
      console.error("❌ Reminder error:", err);
    }
  }, 7200000);

  return io;
}

// --- Helpers for stats ---
export const getUserSocket = (userId) => onlineUsers.get(userId)?.socketId;
export const getOnlineDoctors = async () => {
  const doctorIds = Array.from(onlineUsers.keys());
  const doctors = await User.find({ _id: { $in: doctorIds }, role: "doctor" }).select("_id");
  return doctors.map((d) => d._id.toString());
};

export { onlineUsers };
