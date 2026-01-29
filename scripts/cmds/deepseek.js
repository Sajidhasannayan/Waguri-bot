const axios = require('axios');

module.exports = {
  config: {
    name: "deepseek",
    version: "1.1", // Updated version
    author: "SajidMogged",
    countDown: 3,
    role: 0,
    description: {
      en: "Ask DeepSeek with (R1 or V3 model)"
    },
    category: "ai",
    guide: {
      en: "{pn} <message> -r1 | -v3\nExample: {pn} Hello -r1"
    }
  },

  onStart: async function ({ event, message, args, api }) {
    const userId = event.senderID;
    const rawText = args.join(" ").trim();

    if (!rawText) return message.reply("Please provide a message with `-r1` or `-v3`.");

    const match = rawText.match(/^(.*)\s+-(r1|v3)$/i);
    if (!match) {
      return message.reply("Invalid format. Use like: `/deepseek your question -r1` or `-v3`");
    }

    const [_, prompt, model] = match;
    const API_KEY = process.env.KAIZ_API_KEY; // Get API key from Replit Secrets

    if (!API_KEY) {
      return message.reply("❌ AI service is currently unavailable. (Missing API key)");
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getDeepseekResponse(prompt.trim(), model.toLowerCase(), API_KEY);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("DeepSeek didn't respond. Please try again later.");
    }

    await message.reply(response);
    api.setMessageReaction("✅", event.messageID, () => {}, true);
  },

  onChat: async function () {
    // Disable chat continuation
    return;
  },

  getDeepseekResponse: async function (prompt, model, API_KEY) {
    try {
      const baseUrl = model === "r1"
        ? `https://kaiz-apis.gleeze.com/api/deepseek-r1`
        : `https://kaiz-apis.gleeze.com/api/deepseek-v3`;

      const url = `${baseUrl}?ask=${encodeURIComponent(prompt)}&apikey=${API_KEY}`;
      const { data } = await axios.get(url, { timeout: 20000 });

      return typeof data === "string" ? data : data.response || JSON.stringify(data);
    } catch (err) {
      console.error("DeepSeek error:", err?.response?.data || err);
      return null;
    }
  }
};