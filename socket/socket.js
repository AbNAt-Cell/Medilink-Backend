// socket.js
import { Server } from "socket.io";
import Message from "../models/messages.js";
import Conversation from "../models/Conversation.js";

// Keep a map of connected users { userId: socketId }
const onlineUsers = new Map();

export default function socketSetup(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: "*", // set to frontend URL in production
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("⚡ New client connected", socket.id);

    // User joins
    socket.on("join", (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log(`✅ User ${userId} connected`);
    });

    // Handle sending a new message
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
          const socketId = onlineUsers.get(participantId.toString());
          if (socketId) {
            io.to(socketId).emit("message:new", populated);
          }
        });
      } catch (err) {
        console.error("❌ Socket message error:", err);
      }
    });

    // Mark conversation as read
    socket.on("message:read", async ({ conversationId, userId }) => {
      try {
        await Message.updateMany(
          { conversation: conversationId, readBy: { $ne: userId } },
          { $push: { readBy: userId } }
        );

        const conv = await Conversation.findById(conversationId).lean();
        conv.participants.forEach((participantId) => {
          const socketId = onlineUsers.get(participantId.toString());
          if (socketId) {
            io.to(socketId).emit("message:read:update", {
              conversationId,
              userId
            });
          }
        });
      } catch (err) {
        console.error("❌ Mark as read error:", err);
      }
    });

    // WebRTC placeholders
    socket.on("call:offer", (data) => {
      socket.broadcast.emit("call:offer", data);
    });

    socket.on("call:answer", (data) => {
      socket.broadcast.emit("call:answer", data);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Client disconnected", socket.id);
      for (let [userId, sockId] of onlineUsers.entries()) {
        if (sockId === socket.id) {
          onlineUsers.delete(userId);
          console.log(`❌ User ${userId} disconnected`);
        }
      }
    });
  });

  return io;
}
