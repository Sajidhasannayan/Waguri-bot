const axios = require('axios');

const activeUsers = new Map(); // userId -> last bot message ID

module.exports = {
  config: {
    name: "ai",
    version: "1.0",
    author: "SajidMogged",
    countDown: 3,
    role: 0,
    description: {
      en: "Chat with Aria AI"
    },
    category: "ai",
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
      return message.reply("Ai session has been reset.");
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getAriaResponse(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Ai didn’t respond.");
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

    const response = await this.getAriaResponse(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Ai didn’t respond.");
    }

    const reply = await message.reply(response);
    if (reply?.messageID) {
      activeUsers.set(userId, reply.messageID);
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    }
  },

  getAriaResponse: async function (prompt, uid) {
    try {
      const url = `https://kaiz-apis.gleeze.com/api/aria?ask=${encodeURIComponent(prompt)}&uid=${uid}&apikey=770f0df0-f042-4c9f-8e38-b25635565839`;
      const { data } = await axios.get(url, { timeout: 15000 });
      return typeof data === "string" ? data : data.response || JSON.stringify(data);
    } catch (err) {
      console.error("Aria error:", err);
      return null;
    }
  }
};