const axios = require("axios");

const activeUsers = new Map(); // userId => { msgID }

module.exports = {
  config: {
    name: "catgpt",
    version: "1.0",
    author: "SajidMogged",
    countDown: 3,
    role: 0,
    description: {
      en: "Chat with CatGPT (cat-themed AI)"
    },
    category: "ai",
    guide: {
      en: "{pn} <message> - Chat with cat AI\nReply to continue\n{pn} reset - Reset session"
    }
  },

  onStart: async function ({ event, message, args, api }) {
    const userId = event.senderID;
    let prompt = args.join(" ").trim();

    if (!prompt) return message.reply("Ask something to CatGPT!");

    if (prompt.toLowerCase() === "reset") {
      activeUsers.delete(userId);
      return message.reply("CatGPT session reset.");
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getCatGPTResponse(prompt, userId);
    if (!response?.text) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("CatGPT didn't respond.");
    }

    const last = activeUsers.get(userId);
    if (last?.msgID) api.unsendMessage(last.msgID);

    const reply = await message.reply({
      body: response.text,
      attachment: response.gif ? await global.utils.getStreamFromURL(response.gif) : undefined
    });

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

    const response = await this.getCatGPTResponse(prompt, userId);
    if (!response?.text) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("CatGPT didn't respond.");
    }

    if (last.msgID) api.unsendMessage(last.msgID);

    const reply = await message.reply({
      body: response.text,
      attachment: response.gif ? await global.utils.getStreamFromURL(response.gif) : undefined
    });

    if (reply?.messageID) {
      activeUsers.set(userId, { msgID: reply.messageID });
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    }
  },

  getCatGPTResponse: async function (prompt, uid) {
    try {
      const url = `https://kaiz-apis.gleeze.com/api/catgpt?ask=${encodeURIComponent(prompt)}&uid=${uid}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      const { data } = await axios.get(url, { timeout: 15000 });

      const text = typeof data === "string" ? data : data.response || null;
      const gif = data?.image || (typeof data === "object" && data.url);

      return { text, gif };
    } catch (err) {
      console.error("CatGPT error:", err?.response?.data || err);
      return null;
    }
  }
};