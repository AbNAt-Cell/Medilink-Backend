import Conversation from "../models/Conversation.js";
import User from "../models/userModel.js";
import { onlineUsers } from "../socket/socket.js";
// import Message from "../models/messages.js";


// Start conversation between two users
export const startConversation = async (req, res) => {
  try {
    const { recipientId } = req.body; 

    // Fetch recipient user
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    // Ensure not same role
    if (req.user.role === "doctor" && recipient.role === "doctor") {
      return res.status(403).json({ message: "Doctors can only message marketers" });
    }
    if (req.user.role === "marketer" && recipient.role === "marketer") {
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

    // Populate conversation with participant details including avatars
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("participants", "firstname lastname email role avatarUrl");

    // Add online status to participants
    const conversationObj = populatedConversation.toObject();
    conversationObj.participants = conversationObj.participants.map(participant => {
      const participantId = participant._id.toString();
      const isOnline = onlineUsers.has(participantId);
      
      return {
        _id: participant._id,
        firstname: participant.firstname,
        lastname: participant.lastname,
        email: participant.email,
        role: participant.role,
        avatarUrl: participant.avatarUrl,
        isOnline: isOnline
      };
    });

    res.json(conversationObj);
  } catch (err) {
    console.error("❌ startConversation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all conversations for logged in user
export const getMyConversations = async (req, res) => {
  
  try {
    
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate("participants", "firstname lastname email role avatarUrl")
      .sort({ updatedAt: -1 });

    console.log(`📋 Found ${conversations.length} conversations`);

    // Add online status to each conversation
    const conversationsWithOnlineStatus = conversations.map(conversation => {
      const conversationObj = conversation.toObject();
      
      // Add online status to each participant
      conversationObj.participants = conversationObj.participants.map(participant => {
        const participantId = participant._id.toString();
        const isOnline = onlineUsers.has(participantId);
        console.log(`👤 User ${participant.firstname} ${participant.lastname} (${participantId}): ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
        
        const updatedParticipant = {
          _id: participant._id,
          firstname: participant.firstname,
          lastname: participant.lastname,
          email: participant.email,
          role: participant.role,
          avatarUrl: participant.avatarUrl,
          isOnline: isOnline
        };
        
        console.log(`✅ Updated participant:`, JSON.stringify(updatedParticipant, null, 2));
        return updatedParticipant;
      });
      
      return conversationObj;
    });

    console.log("✅ Sending conversations with online status");
    res.json(conversationsWithOnlineStatus);
  } catch (err) {
    console.error("❌ getMyConversations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
