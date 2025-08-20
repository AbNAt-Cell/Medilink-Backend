import Conversation from "../models/Conversation.js";
// import Message from "../models/messages.js";


// Create or return existing conversation between two users

export const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const userId = req.user._id;

    // check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, participantId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, participantId],
      });
    }

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Get all conversations for logged-in user

export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
    })
      .populate("participants", "name email role")
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
