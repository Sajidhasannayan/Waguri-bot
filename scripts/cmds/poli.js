const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "poli",
    version: "1.0",
    author: "SajidMogged",
    countDown: 15,
    role: 0,
    shortDescription: {
      en: "Generate AI images"
    },
    Description: {
      en: " Generates AI images from text prompts"
    },
    category: "image",
    guide: {
      en: "{pn} <prompt>\nExample: {pn} apple"
    }
  },

  onStart: async function ({ event, message, args }) {
    try {
      const prompt = args.join(' ');
      if (!prompt) {
        return message.reaction('❌', event.messageID);
      }

      const tempFilePath = await this.generatePoliImage(prompt);
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
      console.error("Error in poli command:", error);
      return message.reaction('❌', event.messageID);
    }
  },

  generatePoliImage: async function(prompt) {
    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/poli?prompt=${encodeURIComponent(prompt)}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        responseType: 'stream',
        timeout: 30000
      });

      const tempFilePath = path.join(__dirname, 'tmp', `poli_${Date.now()}.png`);
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
      console.error("Error in generatePoliImage:", error);
      return null;
    }
  }
};