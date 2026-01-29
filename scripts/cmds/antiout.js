const settings = new Map(); // threadID => true/false

module.exports = {
  config: {
    name: "antiout",
    version: "1.1",
    author: "SajidMogged",
    role: 0,
    description: "Re-add users who leave the group",
    category: "box chat",
    guide: {
      en: "{pn} on - Enable\n{pn} off - Disable"
    }
  },

  onStart: async function ({ event, message, args }) {
    const threadID = event.threadID;
    const opt = args[0]?.toLowerCase();

    if (opt === "on") {
      settings.set(threadID, true);
      return message.reply("✅ Antiout enabled. Users who leave will be re-added.");
    } else if (opt === "off") {
      settings.set(threadID, false);
      return message.reply("❌ Antiout disabled.");
    } else {
      return message.reply("Usage:\n/antiout on\n/antiout off");
    }
  },

  onEvent: async function ({ event, api }) {
    if (
      event.logMessageType !== "log:unsubscribe" ||
      !settings.get(event.threadID)
    ) return;

    const threadID = event.threadID;
    const leftUserID = event.logMessageData?.leftParticipantFbId;
    const botID = api.getCurrentUserID();

    if (!leftUserID || leftUserID === botID) return;

    try {
      await api.addUserToGroup(leftUserID, threadID);
      api.sendMessage("⚠️ Antiout active! Added user back to the group.", threadID);
    } catch (err) {
      // If user cannot be re-added (privacy settings, etc.)
      const errMsg =
        err.message?.includes("only admins can add") ? "❌ Bot isn't admin." :
        err.message?.includes("not enough permission") ? "❌ Missing permissions." :
        err.message?.includes("user has blocked the group") ? "❌ User blocked group invites." :
        "❌ Failed to re-add user. Reason: " + err.message;

      console.error("Antiout error:", err.message || err);
      api.sendMessage(errMsg, threadID);
    }
  }
};