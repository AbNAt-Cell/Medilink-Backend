import Notification from "../models/Notification.js";

export const listNotifications = async (req, res) => {
  const items = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 });
  res.json(items);
};

export const markRead = async (req, res) => {
  const { id } = req.params;
  const updated = await Notification.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { read: true },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: "Not found" });
  res.json(updated);
};

export const markAllRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ message: "All notifications marked as read" });
};
