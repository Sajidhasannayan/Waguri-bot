const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "flux",
    version: "1.0",
    author: "SajidMogged",
    countDown: 15,
    role: 0,
    shortDescription: {
      en: "Generate AI images"
    },
    longDescription: {
      en: "Generates AI images from text prompts"
    },
    category: "image",
    guide: {
      en: " {pn} <prompt>\nExample: {pn} a banana wearing sunglasses"
    }
  },

  onStart: async function ({ event, message, args }) {
    try {
      const prompt = args.join(' ');
      if (!prompt) {
        return message.reaction('❌', event.messageID);
      }

      const tempFilePath = await this.generateFluxImage(prompt);
      if (!tempFilePath) {
        return message.reaction('❌', event.messageID);
      }

      await message.reply({
        attachment: fs.createReadStream(tempFilePath)
      }, () => {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
      });

      return message.reaction('✅', event.messageID);
    } catch (error) {
      console.error("Error in flux command:", error);
      return message.reaction('❌', event.messageID);
    }
  },

  generateFluxImage: async function(prompt) {
    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/flux?prompt=${encodeURIComponent(prompt)}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        responseType: 'stream',
        timeout: 30000
      });

      const tempFilePath = path.join(__dirname, 'tmp', `flux_${Date.now()}.jpg`);
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
      console.error("Error in generateFluxImage:", error);
      return null;
    }
  }
};