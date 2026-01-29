const axios = require('axios');

const activeUsers = new Map(); // userId -> last bot message ID

module.exports = {
  config: {
    name: "makima",
    version: "1.0",
    author: "SajidMogged",
    countDown: 3,
    role: 0,
    description: "Chat with Makima AI",
    category: "anime",
    guide: {
      en: "{pn} <message> - Start chat\nReply to continue conversation\n{pn} reset - Reset session"
    }
  },

  onStart: async function ({ event, message, args, api }) {
    const userId = event.senderID;
    let prompt = args.join(" ").trim();

    if (!prompt) return message.reply("Please provide a message.");

    if (prompt.toLowerCase() === "reset") {
      activeUsers.delete(userId);
      return message.reply("Makima session has been reset.");
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getMakimaResponse(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Makima didn’t respond.");
    }

    const reply = await message.reply(response);
    if (reply?.messageID) {
      activeUsers.set(userId, reply.messageID);
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    }
  },

  onChat: async function ({ event, message, api }) {
    const userId = event.senderID;
    const lastBotMsgId = activeUsers.get(userId);
    if (!lastBotMsgId || event.messageReply?.messageID !== lastBotMsgId) return;

    const prompt = event.body.trim();
    if (!prompt) return;

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getMakimaResponse(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Makima didn’t respond.");
    }

    const reply = await message.reply(response);
    if (reply?.messageID) {
      activeUsers.set(userId, reply.messageID);
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    }
  },

  getMakimaResponse: async function (prompt, uid) {
    try {
      const url = `https://kaiz-apis.gleeze.com/api/makima?ask=${encodeURIComponent(prompt)}&uid=${uid}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      const { data } = await axios.get(url, { timeout: 15000 });
      return typeof data === "string" ? data : data.response || JSON.stringify(data);
    } catch (err) {
      console.error("Makima error:", err);
      return null;
    }
  }
};