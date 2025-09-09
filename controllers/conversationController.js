import Conversation from "../models/Conversation.js";
import User from "../models/userModel.js";
import { onlineUsers } from "../socket/socket.js";

// Start conversation AND register sender peer ID
export const startConversation = async (req, res) => {
  try {
    const { recipientId, peerId } = req.body;
    const senderId = req.user._id.toString();

    if (!recipientId || !peerId) {
      return res.status(400).json({ message: "recipientId and peerId are required" });
    }

    // Register sender's peer ID
    const existing = onlineUsers.get(senderId) || {};
    onlineUsers.set(senderId, { ...existing, peerId });

    // Fetch recipient
    const recipient = await User.findById(recipientId);
    if (!recipient) return res.status(404).json({ message: "Recipient not found" });

    // Ensure not same role
    if (req.user.role === recipient.role)
      return res.status(403).json({ message: "Cannot message same role" });

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] }
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipientId]
      });
    }

    // Get recipient's peer ID
    const recipientData = onlineUsers.get(recipientId.toString());
    const recipientPeerId = recipientData?.peerId || null;

    // Respond with conversation + recipientPeerId
    res.json({ conversation, recipientPeerId });
  } catch (err) {
    console.error("❌ startConversation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all conversations for logged-in user
export const getMyConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate("participants", "firstname lastname email role")
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    console.error("❌ getMyConversations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
