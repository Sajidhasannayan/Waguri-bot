const axios = require("axios");

const activeUsers = new Map(); // userId => { msgID }

module.exports = {
  config: {
    name: "bot",
    version: "1.0",
    author: "SajidMogged",
    countDown: 3,
    role: 0,
    description: {
      en: "Chat with bot"
    },
    category: "ai",
    guide: {
      en: "{pn} <message> - Start a chat\nReply to continue\n{pn} reset - Reset session"
    }
  },

  onStart: async function ({ event, message, args, api }) {
    const userId = event.senderID;
    const prompt = args.join(" ").trim();

    if (!prompt) return message.reply("Please say something to the AI.");
    if (prompt.toLowerCase() === "reset") {
      activeUsers.delete(userId);
      return message.reply("You-AI session has been reset.");
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getBotResponse(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Bot didn’t respond.");
    }

    const last = activeUsers.get(userId);
    if (last?.msgID) api.unsendMessage(last.msgID);

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

    const prompt = event.body?.trim();
    if (!prompt) return;

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getBotResponse(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Bot didn’t respond.");
    }

    if (last.msgID) api.unsendMessage(last.msgID);

    const reply = await message.reply(response);
    if (reply?.messageID) {
      activeUsers.set(userId, { msgID: reply.messageID });
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    }
  },

  getBotResponse: async function (prompt, uid) {
    try {
      const url = `https://kaiz-apis.gleeze.com/api/you-ai?ask=${encodeURIComponent(prompt)}&uid=${uid}&apikey=770f0df0-f042-4c9f-8e38-b25635565839`;
      const { data } = await axios.get(url, { timeout: 15000 });

      return typeof data === "string" ? data : data.response || JSON.stringify(data);
    } catch (err) {
      console.error("You-AI error:", err?.response?.data || err);
      return null;
    }
  }
};