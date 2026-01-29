const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "removebg",
    version: "1.1", // Updated version
    author: "SajidMogged",
    countDown: 10, // Increased timeout
    role: 0,
    shortDescription: {
      en: "Remove image background (Premium)"
    },
    longDescription: {
      en: "Removes the background from images with high-quality results"
    },
    category: "image",
    guide: {
      en: "Reply to an image with {pn}"
    }
  },

  onStart: async function ({ api, event, message }) {
    let tempFilePath;
    
    try {
      // Check if the message is a reply to an image
      if (!event.messageReply?.attachments?.length) {
        return message.reply("❌ Please reply to an image to remove its background.");
      }

      const attachment = event.messageReply.attachments[0];
      if (!['photo', 'animated_image'].includes(attachment.type)) {
        return message.reply("❌ Only photo attachments are supported.");
      }

      const API_KEY = process.env.KAIZ_API_KEY; // Get API key from Replit Secrets
      if (!API_KEY) {
        return message.reply("❌ Background removal service is currently unavailable. (Missing API key)");
      }

      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      // Create temp directory if it doesn't exist
      const tempDir = path.join(__dirname, 'tmp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Process the image
      tempFilePath = await this.removeBackground(attachment.url, API_KEY);
      if (!tempFilePath) {
        throw new Error("Failed to process image");
      }

      // Verify the output file
      if (!fs.existsSync(tempFilePath) || fs.statSync(tempFilePath).size === 0) {
        throw new Error("Empty result file");
      }

      await message.reply({
        body: "✅ Background removed successfully!",
        attachment: fs.createReadStream(tempFilePath)
      });

      api.setMessageReaction("✅", event.messageID, () => {}, true);

    } catch (error) {
      console.error("removebg error:", error);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      
      let errorMessage = "❌ Failed to remove background. Please try again.";
      if (error.response) {
        errorMessage += `\n(API Status: ${error.response.status})`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = "⌛ Processing took too long. Please try with a smaller image.";
      }
      
      message.reply(errorMessage);
    } finally {
      // Clean up temp file
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.error("Error deleting temp file:", cleanupError);
        }
      }
    }
  },

  removeBackground: async function(imageUrl, API_KEY) {
    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/removebgv3?url=${encodeURIComponent(imageUrl)}&stream=true&apikey=${API_KEY}`;
      
      console.log("Processing image:", apiUrl); // Debug log
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        responseType: 'stream',
        timeout: 60000 // 1 minute timeout
      });

      const tempFilePath = path.join(__dirname, 'tmp', `nobg_${Date.now()}.png`);
      const writer = fs.createWriteStream(tempFilePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(tempFilePath));
        writer.on('error', (err) => {
          console.error("Stream error:", err);
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
          reject(err);
        });
      });
    } catch (error) {
      console.error("removeBackground error:", error.response?.data || error.message);
      return null;
    }
  }
};