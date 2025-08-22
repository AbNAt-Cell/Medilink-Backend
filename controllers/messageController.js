import Message from "../models/messages.js";
import Conversation from "../models/Conversation.js";


// Send message in conversation
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const userId = req.user._id;

    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      text,
      readBy: [userId],
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: text,
      updatedAt: new Date(),
    });

    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// Get messages in a conversation

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "name email role")
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Mark messages as read

export const markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    await Message.updateMany(
      { conversation: conversationId, readBy: { $ne: req.user._id } },
      { $push: { readBy: req.user._id } }
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
