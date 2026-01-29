const axios = require('axios');

const activeUsers = new Map(); // userId -> { msgID }

module.exports = {
  config: {
    name: "fubuki",
    version: "1.0",
    author: "SajidMogged",
    countDown: 3,
    role: 0,
    description: {
      en: "Chat with Fubuki"
    },
    category: "anime",
    guide: {
      en: "{pn} <message> - Start chat\nReply to continue\n{pn} reset - Reset session"
    }
  },

  onStart: async function ({ event, message, args, api }) {
    const userId = event.senderID;
    let prompt = args.join(" ").trim();

    if (!prompt) return message.reply("Please provide a message.");

    if (prompt.toLowerCase() === "reset") {
      activeUsers.delete(userId);
      return message.reply("Fubuki session has been reset.");
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getFubukiResponse(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Fubuki didn’t respond.");
    }

    const last = activeUsers.get(userId);
    if (last?.msgID) {
      api.unsendMessage(last.msgID);
    }

    const reply = await message.reply(response);
    if (reply?.messageID) {
      activeUsers.set(userId, { msgID: reply.messageID });
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    }
  },

  onChat: async function ({ event, message, api }) {
    const userId = event.senderID;
    const last = activeUsers.get(userId);
    if (!last?.msgID || event.messageReply?.messageID !== last.msgID) return;

    const prompt = event.body.trim();
    if (!prompt) return;

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getFubukiResponse(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Fubuki didn’t respond.");
    }

    if (last.msgID) {
      api.unsendMessage(last.msgID);
    }

    const reply = await message.reply(response);
    if (reply?.messageID) {
      activeUsers.set(userId, { msgID: reply.messageID });
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    }
  },

  getFubukiResponse: async function (prompt, uid) {
    try {
      const url = `https://kaiz-apis.gleeze.com/api/fubuki?ask=${encodeURIComponent(prompt)}&uid=${uid}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      const { data } = await axios.get(url, { timeout: 15000 });

      return typeof data === "string" ? data : data.response || JSON.stringify(data);
    } catch (err) {
      console.error("Fubuki error:", err?.response?.data || err);
      return null;
    }
  }
};