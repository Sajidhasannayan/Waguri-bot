const axios = require('axios');

module.exports = {
  config: {
    name: "randomcat",
    version: "1.1", // Updated version
    author: "SajidMogged",
    countDown: 10, // Increased timeout
    role: 0,
    description: {
      en: "Get a random cat image"
    },
    category: "image",
    guide: {
      en: "{pn} - Sends a random cat image"
    }
  },

  onStart: async function ({ message }) {
    try {
      const API_KEY = process.env.KAIZ_API_KEY; // Get API key from Replit Secrets

      if (!API_KEY) {
        return message.reply("❌ Cat service is currently unavailable. (Missing API key)");
      }

      const res = await axios.get(`https://kaiz-apis.gleeze.com/api/randomcat?apikey=${API_KEY}`, {
        timeout: 10000 // 10 seconds timeout
      });

      const imageUrl = res.data.images?.[0];

      if (!imageUrl) {
        return message.reply("🐱 Couldn't find a cat image at the moment. Try again later!");
      }

      // React with loading emoji
      message.reaction("⏳", (err) => {
        if (err) console.error("Reaction error:", err);
      });

      const imageStream = await global.utils.getStreamFromURL(imageUrl);
      if (!imageStream) {
        return message.reply("❌ Failed to process the cat image.");
      }

      await message.reply({
        body: "🐱 Here's a random cat for you!",
        attachment: imageStream
      });

      // React with success emoji
      message.reaction("✅", (err) => {
        if (err) console.error("Reaction error:", err);
      });

    } catch (error) {
      console.error("randomcat error:", error);
      
      let errorMessage = "❌ Failed to fetch cat image. The cats are sleeping!";
      if (error.response) {
        errorMessage += `\n(Status: ${error.response.status})`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "⌛ The cat took too long to arrive! Try again.";
      }
      
      message.reply(errorMessage);
    }
  }
};