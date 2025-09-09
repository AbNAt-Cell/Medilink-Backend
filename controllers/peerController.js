import { onlineUsers } from "../socket/socket.js";

export const getPeerId = (req, res) => {
  const { userId } = req.params;

  const user = onlineUsers.get(userId.toString());
  if (user?.peerId) {
    return res.json({ peerId: user.peerId });
  }

  return res.status(404).json({ message: "User is offline or not registered" });
};
