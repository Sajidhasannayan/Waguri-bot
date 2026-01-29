const axios = require('axios');

const activeUsers = new Map(); // userId -> last bot message ID

module.exports = {
  config: {
    name: "gpt",
    version: "4.1", // Updated version
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    description: {
      en: "Chat with OpenAI GPT-4o"
    },
    category: "ai",
    guide: {
      en: "{pn} <message> - Start chat\nReply to continue\nReply to image: {pn} [message]\n{pn} reset - Reset session"
    }
  },

  onStart: async function ({ event, message, args, api }) {
    const userId = event.senderID;
    let prompt = args.join(" ").trim();
    let imageUrl = null;
    const API_KEY = process.env.KAIZ_API_KEY; // Get API key from Replit Secrets

    if (!API_KEY) {
      return message.reply("❌ AI service is currently unavailable. (Missing API key)");
    }

    if (!prompt && !event.messageReply?.attachments) {
      return message.reply("Please provide a message or reply to an image.");
    }

    if (prompt.toLowerCase() === "reset") {
      activeUsers.delete(userId);
      return message.reply("GPT session has been reset.");
    }

    if (event.messageReply?.attachments?.length > 0) {
      const attachment = event.messageReply.attachments[0];
      if (attachment.type === 'photo' || attachment.type === 'animated_image') {
        imageUrl = attachment.url;
        if (!prompt) prompt = "Describe this image";
      }
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getGptResponse(prompt, imageUrl, userId, API_KEY);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("GPT didn't respond. Please try again later.");
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
    const API_KEY = process.env.KAIZ_API_KEY;

    if (!API_KEY) return;
    if (!lastBotMsgId || event.messageReply?.messageID !== lastBotMsgId) return;

    const prompt = event.body.trim();
    if (!prompt) return;

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getGptResponse(prompt, null, userId, API_KEY);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("GPT didn't respond. Please try again later.");
    }

    const reply = await message.reply(response);
    if (reply?.messageID) {
      activeUsers.set(userId, reply.messageID);
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    }
  },

  getGptResponse: async function (prompt, imageUrl, uid, API_KEY) {
    try {
      const base = `https://kaiz-apis.gleeze.com/api/gpt4o-latest`;
      let url = `${base}?ask=${encodeURIComponent(prompt)}&uid=${uid}&apikey=${API_KEY}`;
      
      if (imageUrl) {
        url += `&imageUrl=${encodeURIComponent(imageUrl)}`;
      }

      const { data } = await axios.get(url, { timeout: 15000 });
      return typeof data === "string" ? data : data.response || JSON.stringify(data);
    } catch (err) {
      console.error("GPT error:", err.response?.data || err);
      return null;
    }
  }
};