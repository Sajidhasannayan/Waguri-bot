const axios = require("axios");

module.exports = {
  config: {
    name: "waifu3",
    version: "1.0",
    author: "SajidMogged",
    countDown: 3,
    role: 0,
    description: {
      en: "Send a random waifu image"
    },
    category: "anime",
    guide: {
      en: "{pn} - Sends a random waifu"
    }
  },

  onStart: async function ({ event, message, api }) {
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const res = await axios.get("https://kaiz-apis.gleeze.com/api/waifu?apikey=828c7c9b-3017-4647-b757-22853d6c9dd5");
      const imageUrl = res.data?.imageUrl;

      if (!imageUrl) throw new Error("No image received.");

      const stream = await global.utils.getStreamFromURL(imageUrl);
      await message.reply({ attachment: stream });

      api.setMessageReaction("✅", event.messageID, () => {}, true);
    } catch (err) {
      console.error("Waifu3 error:", err.message || err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("❌ Failed to fetch waifu image.");
    }
  }
};