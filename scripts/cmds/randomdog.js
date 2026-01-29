const axios = require('axios');

module.exports = {
  config: {
    name: "randomdog",
    version: "1.1", // Updated version
    author: "SajidMogged",
    countDown: 10, // Increased timeout
    role: 0,
    description: {
      en: "Get a random dog image with breed information"
    }, // Enhanced description
    category: "image",
    guide: {
      en: "{pn} - Sends a random dog image with breed info"
    }
  },

  onStart: async function ({ api, event, message }) {
    try {
      const API_KEY = process.env.KAIZ_API_KEY; // Get API key from Replit Secrets

      if (!API_KEY) {
        return message.reply("❌ Dog service is currently unavailable. (Missing API key)");
      }

      // Show loading reaction
      api.setMessageReaction("🐾", event.messageID, () => {}, true);

      const { data } = await axios.get(`https://kaiz-apis.gleeze.com/api/randomdog?apikey=${API_KEY}`, {
        timeout: 10000 // 10 seconds timeout
      });

      if (!data.imageUrl) {
        return message.reply("🐶 Couldn't find a dog at the park! Try again later.");
      }

      const dogInfo = data.breeds?.[0] || {};
      const caption = [
        "🐕 Here's a random dog for you!",
        dogInfo.name && `Breed: ${dogInfo.name}`,
        dogInfo.temperament && `Temperament: ${dogInfo.temperament}`,
        dogInfo.origin && `Origin: ${dogInfo.origin}`
      ].filter(Boolean).join('\n');

      const imageStream = await global.utils.getStreamFromURL(data.imageUrl);
      if (!imageStream) {
        return message.reply("❌ Failed to fetch the dog image.");
      }

      await message.reply({
        body: caption || "🐶 Here's a random dog!",
        attachment: imageStream
      });

      // Show success reaction
      api.setMessageReaction("✅", event.messageID, () => {}, true);

    } catch (error) {
      console.error("randomdog error:", error);
      
      let errorMessage = "❌ Failed to fetch dog image. The dog ran away!";
      if (error.response) {
        errorMessage += `\n(Status: ${error.response.status})`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "⌛ The dog took too long to fetch its ball! Try again.";
      }
      
      message.reply(errorMessage);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
    }
  }
};