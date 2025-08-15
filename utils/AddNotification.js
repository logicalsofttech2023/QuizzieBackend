const Notification  = require("../models/NotificationModel");

const addNotification = async (userId, title, body) => {
  try {
    const notification = new Notification({
      userId,
      title,
      body,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error saving notification:", error);
    throw error;
  }
};

module.exports = addNotification;
