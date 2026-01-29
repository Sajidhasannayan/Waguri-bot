const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "4k",
    version: "1.1", // Updated version
    author: "SajidMogged",
    countDown: 15,
    role: 0,
    shortDescription: {
      en: "Enhance images to 4K"
    },
    longDescription: {
      en: "Enhances a replied image to 4K quality"
    },
    category: "image",
    guide: {
      en: "Reply to an image with {pn}"
    }
  },

  onStart: async function ({ api, event, message }) {
    try {
      // Check if the message is a reply to an image
      if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
        return message.reply("❌ Please reply to an image to enhance it.");
      }

      const attachment = event.messageReply.attachments[0];
      if (attachment.type !== 'photo') {
        return message.reply("❌ Only photo attachments can be enhanced.");
      }

      const imageUrl = attachment.url;
      const API_KEY = process.env.KAIZ_API_KEY; // Get API key from Replit Secrets

      if (!API_KEY) {
        return message.reply("❌ Image enhancement service is currently unavailable. (Missing API key)");
      }

      // React with ⏳ while processing
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      // Create tmp directory if it doesn't exist
      const tmpDir = path.join(__dirname, 'tmp');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir);
      }

      // Enhance the image to 4K
      const tempFilePath = await this.enhanceTo4K(imageUrl, API_KEY);
      if (!tempFilePath) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Failed to enhance the image. Please try again later.");
      }

      // Send the enhanced image
      await message.reply({
        body: "✅ Image enhanced to 4K quality",
        attachment: fs.createReadStream(tempFilePath)
      });

      // Clean up
      fs.unlinkSync(tempFilePath);
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    } catch (error) {
      console.error("Error in 4k command:", error);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("❌ An error occurred while processing the image.");
    }
  },

  enhanceTo4K: async function(imageUrl, API_KEY) {
    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/remini?url=${encodeURIComponent(imageUrl)}&stream=true&apikey=${API_KEY}`;
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        responseType: 'stream',
        timeout: 60000 // Increased timeout for larger images
      });

      const tempFilePath = path.join(__dirname, 'tmp', `4k_${Date.now()}.jpg`);
      const writer = fs.createWriteStream(tempFilePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(tempFilePath));
        writer.on('error', (err) => {
          console.error("File write error:", err);
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          reject(null);
        });
      });
    } catch (error) {
      console.error("Error in enhanceTo4K:", error);
      return null;
    }
  }
};