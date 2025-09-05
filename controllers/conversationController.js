import Conversation from "../models/Conversation.js";
// import Message from "../models/messages.js";


// Start conversation between two users
export const startConversation = async (req, res) => {
  try {
    const { recipientId } = req.body;

    // Ensure not same role
    if (req.user.role === "doctor" && req.user.role === recipientId.role) {
      return res.status(403).json({ message: "Doctors can only message marketers" });
    }
    if (req.user.role === "marketer" && req.user.role === recipientId.role) {
      return res.status(403).json({ message: "Marketers can only message doctors" });
    }

    // Check if exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipientId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, recipientId]
      });
    }

    res.json(conversation);
  } catch (err) {
    console.error("❌ startConversation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 🟢 Get all conversations for logged in user
export const getMyConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate("participants", "firstname lastname email role")
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    console.error("❌ getMyConversations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
