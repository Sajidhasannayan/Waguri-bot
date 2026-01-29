const axios = require('axios');

const activeUsers = new Map(); // userId -> { msgID }

module.exports = {
  config: {
    name: "yorforger",
    version: "1.1",
    author: "SajidMogged",
    countDown: 3,
    role: 0,
    description: {
      en: "Chat with Yor Forger"
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
      return message.reply("Yor Forger session has been reset.");
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getYorResponse(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Yor didn’t respond.");
    }

    // Unsend previous Yor message if exists
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

    const response = await this.getYorResponse(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Yor didn’t respond.");
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

  getYorResponse: async function (prompt, uid) {
    try {
      const url = `https://kaiz-apis.gleeze.com/api/yor-forger?ask=${encodeURIComponent(prompt)}&uid=${uid}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      const { data } = await axios.get(url, { timeout: 15000 });

      return typeof data === "string" ? data : data.response || JSON.stringify(data);
    } catch (err) {
      console.error("Yor Forger error:", err?.response?.data || err);
      return null;
    }
  }
};