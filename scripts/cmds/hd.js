const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "hd",
    version: "1.0",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Convert image to HD"
    },
    Description: {
      en: "Upscales a replied image to high-definition quality using the upscale API"
    },
    category: "image",
    guide: {
      en: "Reply to an image with {pn} to convert it to HD quality"
    }
  },

  onStart: async function ({ message, event }) {
    try {
      // Check if the message is a reply to an image
      if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
        return;
      }

      const attachment = event.messageReply.attachments[0];
      if (!attachment.url || !['photo', 'sticker'].includes(attachment.type)) {
        return;
      }

      const imageUrl = attachment.url;

      // Convert the image to HD using the upscale API
      const imageStream = await this.convertToHD(imageUrl);

      if (imageStream) {
        return message.reply({
          attachment: imageStream
        }, () => {
          // Delete the temporary file after sending
          const tempFilePath = imageStream.path;
          fs.unlink(tempFilePath, (err) => {
            if (err) console.error("Error deleting temp file:", err);
          });
        });
      }

      return;
    } catch (error) {
      console.error("Error in hd command:", error);
      return;
    }
  },

  convertToHD: async function(imageUrl) {
    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/upscale?imageUrl=${encodeURIComponent(imageUrl)}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        responseType: 'stream',
        timeout: 30000
      });

      // Create temporary file path
      const tempFilePath = path.join(__dirname, 'tmp', `hd_${Date.now()}.png`);
      const writer = fs.createWriteStream(tempFilePath);

      // Pipe the response to file
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(fs.createReadStream(tempFilePath)));
        writer.on('error', (err) => {
          fs.unlink(tempFilePath, () => {});
          reject(err);
        });
      });
    } catch (error) {
      console.error("Error in convertToHD:", error);
      return null;
    }
  }
};