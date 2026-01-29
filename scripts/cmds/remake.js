const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "remake",
    version: "1.0",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Remake an image with a new style"
    },
    longDescription: {
      en: "Transforms a replied image into a remade version using the reimagine API"
    },
    category: "image",
    guide: {
      en: "Reply to an image with {pn} to remake it into a new style"
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

      // Transform the image using the reimagine API
      const imageStream = await this.transformToRemake(imageUrl);

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
      console.error("Error in remake command:", error);
      return;
    }
  },

  transformToRemake: async function(imageUrl) {
    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/reimagine?url=${encodeURIComponent(imageUrl)}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        responseType: 'stream',
        timeout: 30000
      });

      // Create temporary file path
      const tempFilePath = path.join(__dirname, 'tmp', `remake_${Date.now()}.png`);
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
      console.error("Error in transformToRemake:", error);
      return null;
    }
  }
};