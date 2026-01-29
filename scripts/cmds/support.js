module.exports = {
  config: {
    name: "support",
    version: "2.0",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    shortDescription: "Join bot support group",
    description: {
      en: "Join the bot's official support group chat"
    },
    category: "support-gc",
    guide: {
      en: "/support"
    }
  },

  onStart: async function ({ event, api, message }) {
    const supportGroupID = "9214581665337322"; // Your real support group ID
    const inviteLink = "https://m.me/j/AbY67cSnAPVqhSKj/"; // Your real invite link
    const userID = event.senderID;

    try {
      const threadInfo = await api.getThreadInfo(supportGroupID);
      const participants = threadInfo.participantIDs;

      if (participants.includes(userID)) {
        return message.reply("✅ You're already in the support group!\n" + inviteLink);
      }

      // Try to add the user
      await api.addUserToGroup(userID, supportGroupID);

      // Send success message regardless of whether FB shows an error
      return message.reply({
        body: `🚀 You've been added (or already requested) to the support group!\nIf you don't see the group, join manually:\n${inviteLink}`,
        attachment: await global.utils.getStreamFromURL("https://i.imgur.com/iowdm9v.jpg")
      });

    } catch (error) {
      console.error("Support Group Error:", error.message || error);

      return message.reply(
        `⚠️ I couldn't automatically add you to the group. You can still join using this invite link:\n${inviteLink}`
      );
    }
  }
};