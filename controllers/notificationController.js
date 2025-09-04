// controllers/notificationController.js
import Notification from "../models/Notifications.js";
import { getUserSocket } from "../socket/socket.js";

// ✅ Fetch doctor notifications
export const getMyNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 });
  res.json(notifications);
};

// ✅ Mark single notification as read
export const markAsRead = async (req, res) => {
  const notification = await Notification.findByIdAndUpdate(
    req.params.id,
    { read: true },
    { new: true }
  );
  res.json(notification);
};

// ✅ Mark all as read
export const markAllAsRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id }, { read: true });
  res.json({ success: true });
};

// ✅ Send notification (used internally by forms/appointments)
export const pushNotification = async ({ userId, type, message, link, io, recurring = false }) => {
  const notif = await Notification.create({
    user: userId,
    type,
    message,
    link,
    recurring
  });

  const socketId = getUserSocket(userId);
  if (socketId && io) {
    io.to(socketId).emit("notification:new", notif); // 🔔 frontend plays sound here
  }

  return notif;
};
