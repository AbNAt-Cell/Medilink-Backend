// // services/reminderService.js
// import Form from "../models/Form.js";
// import { getOnlineDoctors } from "../socket/socket.js";
// import { pushNotification } from "../controllers/notificationController.js";

// export default function startReminderService(io) {
//   setInterval(async () => {
//     try {
//       const pendingForms = await Form.find({ status: "pending" });
//       if (pendingForms.length === 0) return;

//       const onlineDoctors = await getOnlineDoctors();

//       for (const form of pendingForms) {
//         for (const doctorId of onlineDoctors) {
//           await pushNotification({
//             userId: doctorId,
//             type: "reminder",
//             message: "⏰ Reminder: A client form is still unclaimed!",
//             link: `/forms/${form._id}`,
//             recurring: true,
//             io
//           });
//         }
//       }
//     } catch (err) {
//       console.error("❌ Reminder service error:", err);
//     }
//   }, 60 * 1000); // every 1 minute
// }
