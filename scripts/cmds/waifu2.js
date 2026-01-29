const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "waifu2",
    version: "1.0",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Get a random waifu image"
    },
    longDescription: {
      en: "Fetches a random waifu image"
    },
    category: "fun",
    guide: {
      en: "{pn}\nExample: {pn}"
    }
  },

  onStart: async function ({ event, message }) {
    try {
      const tempFilePath = await this.getWaifuImage();
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
      console.error("Error in waifu2 command:", error);
      return message.reaction('❌', event.messageID);
    }
  },

  getWaifuImage: async function() {
    try {
      const apiUrl = 'https://kaiz-apis.gleeze.com/api/bluearchive?apikey=828c7c9b-3017-4647-b757-22853d6c9dd5';
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        responseType: 'stream',
        timeout: 15000
      });

      const tempFilePath = path.join(__dirname, 'tmp', `waifu2_${Date.now()}.png`);
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
      console.error("Error in getWaifuImage:", error);
      return null;
    }
  }
};