const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "upscale",
    version: "1.0",
    author: "SajidMogged",
    countDown: 15,
    role: 0,
    shortDescription: {
      en: "Upscale images"
    },
    longDescription: {
      en: " Upscales a replied image to higher quality"
    },
    category: "image",
    guide: {
      en: " Reply to an image with {pn}"
    }
  },

  onStart: async function ({ event, message }) {
    try {
      // Check if the message is a reply to an image
      if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
        return message.reaction('❌', event.messageID);
      }

      const attachment = event.messageReply.attachments[0];
      if (attachment.type !== 'photo' && attachment.type !== 'animated_image') {
        return message.reaction('❌', event.messageID);
      }

      const imageUrl = attachment.url;

      // Upscale the image
      const tempFilePath = await this.upscaleImage(imageUrl);
      if (!tempFilePath) {
        return message.reaction('❌', event.messageID);
      }

      // Send the upscaled image
      await message.reply({
        attachment: fs.createReadStream(tempFilePath)
      }, () => {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
      });

      // React with ✅ on success
      return message.reaction('✅', event.messageID);
    } catch (error) {
      console.error("Error in upscale command:", error);
      return message.reaction('❌', event.messageID);
    }
  },

  upscaleImage: async function(imageUrl) {
    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/upscalev3?url=${encodeURIComponent(imageUrl)}&stream=true&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        responseType: 'stream',
        timeout: 30000
      });

      const tempFilePath = path.join(__dirname, 'tmp', `upscaled_${Date.now()}.png`);
      const writer = fs.createWriteStream(tempFilePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(tempFilePath));
        writer.on('error', (err) => {
          fs.unlink(tempFilePath, () => {});
          reject(err);
        });
      });
    } catch (error) {
      console.error("Error in upscaleImage:", error);
      return null;
    }
  }
};