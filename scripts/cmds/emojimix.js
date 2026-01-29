const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "emojimix",
    version: "1.0",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Mix emojis"
    },
    longDescription: {
      en: "Combine two emojis into a mixed image"
    },
    category: "fun",
    guide: {
      en: " {pn} <emoji1> <emoji2>\nExample: {pn} 🥰 😂"
    }
  },

  onStart: async function ({ message, args }) {
    try {
      const emoji1 = args[0];
      const emoji2 = args[1];

      if (!emoji1 || !emoji2) {
        return message.reply("❌ These emojis can't be mixed");
      }

      const tempFilePath = await this.generateMix(emoji1, emoji2);
      if (!tempFilePath) {
        return message.reply("❌ These emojis can't be mixed");
      }

      await message.reply({
        attachment: fs.createReadStream(tempFilePath)
      }, () => {
        fs.unlink(tempFilePath, (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
      });
    } catch (error) {
      console.error("Error in emojimix command:", error);
      return message.reply("❌ These emojis can't be mixed");
    }
  },

  generateMix: async function(emoji1, emoji2) {
    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/emojimix?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        responseType: 'stream',
        timeout: 15000
      });

      const tempFilePath = path.join(__dirname, 'tmp', `emojimix_${Date.now()}.png`);
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
      console.error("Error in generateMix:", error);
      return null;
    }
  }
};