const axios = require('axios');

const activeUsers = new Map(); // userId -> { lastBotMsgID }

module.exports = {
  config: {
    name: "mitsuri",
    version: "1.0",
    author: "SajidMogged",
    countDown: 3,
    role: 0,
    description: {
      en: "Chat with Mitsuri AI"
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
      return message.reply("Mitsuri session has been reset.");
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getMitsuriResponse(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Mitsuri didn’t respond.");
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

    const response = await this.getMitsuriResponse(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Mitsuri didn’t respond.");
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

  getMitsuriResponse: async function (prompt, uid) {
    try {
      const url = `https://kaiz-apis.gleeze.com/api/mitsuri?ask=${encodeURIComponent(prompt)}&uid=${uid}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      const { data } = await axios.get(url, { timeout: 15000 });

      let raw = typeof data === "string" ? data : data.response || JSON.stringify(data);

      // Convert fancy italic Unicode to normal text
      const unicodeToAscii = char => {
        const code = char.codePointAt(0);
        // a-z italic
        if (code >= 0x1D44E && code <= 0x1D467) return String.fromCharCode(code - 0x1D44E + 0x61);
        // A-Z italic
        if (code >= 0x1D434 && code <= 0x1D44D) return String.fromCharCode(code - 0x1D434 + 0x41);
        return char;
      };

      const normalized = [...raw].map(unicodeToAscii).join('');
      return normalized;

    } catch (err) {
      console.error("Mitsuri error:", err);
      return null;
    }
  }
};