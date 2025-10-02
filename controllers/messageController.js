import Message from "../models/messages.js";
import Conversation from "../models/Conversation.js";
import User from "../models/userModel.js";
import { onlineUsers } from "../socket/socket.js";


// Send message in conversation
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text, url, type } = req.body;
    const userId = req.user._id;

    // Validate that either text or url is provided
    if (!text && !url) {
      return res.status(400).json({ message: "Either text or url must be provided" });
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: userId,
      text,
      url,
      type: type || (url ? "file" : "text"),
      readBy: [userId],
    });

    // Update conversation with appropriate last message
    let lastMessage;
    if (text) {
      lastMessage = text;
    } else if (url) {
      switch (type) {
        case "voice":
          lastMessage = "🎙️ Voice message";
          break;
        case "image":
          lastMessage = "📷 Image";
          break;
        case "video":
          lastMessage = "🎥 Video";
          break;
        case "audio":
          lastMessage = "🎵 Audio";
          break;
        case "audioCall":
          lastMessage = "📞 Audio call";
          break;
        case "videoCall":
          lastMessage = "📹 Video call";
          break;
        case "file":
          lastMessage = "📎 File";
          break;
        default:
          lastMessage = "📎 Attachment";
      }
    } else {
      // Handle call messages without URL (for call notifications)
      switch (type) {
        case "audioCall":
          lastMessage = "📞 Audio call";
          break;
        case "videoCall":
          lastMessage = "📹 Video call";
          break;
        default:
          lastMessage = "New message";
      }
    }
    
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage,
      updatedAt: new Date(),
    });

    // Populate sender info before returning
    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "firstname lastname email role avatarUrl");

    res.status(201).json(populatedMessage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// Get messages in a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "firstname lastname email role avatarUrl")
      .sort({ createdAt: 1 });

    // Add online status to message senders
    const messagesWithOnlineStatus = messages.map(message => {
      const messageObj = message.toObject();
      if (messageObj.sender) {
        const senderId = messageObj.sender._id.toString();
        const isOnline = onlineUsers.has(senderId);
        messageObj.sender = {
          ...messageObj.sender,
          isOnline: isOnline,
          status: isOnline ? "online" : "offline"
        };
      }
      return messageObj;
    });

    res.json(messagesWithOnlineStatus);
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
