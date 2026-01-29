const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "pfp",
    version: "1.0",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Get profile picture"
    },
    longDescription: {
      en: "Get user's profile picture in high quality"
    },
    category: "image",
    guide: {
      en: "{pn} [@mention|reply|leave empty for your own]"
    }
  },

  onStart: async function ({ event, message, usersData, args }) {
    try {
      let targetID;
      
      // Case 1: User mentions someone
      if (Object.keys(event.mentions).length > 0) {
        targetID = Object.keys(event.mentions)[0];
      }
      // Case 2: User replies to someone
      else if (event.messageReply) {
        targetID = event.messageReply.senderID;
      }
      // Case 3: No reply or mention - use sender's ID
      else {
        targetID = event.senderID;
      }

      // Get user info for name
      const userInfo = await usersData.get(targetID);
      const name = userInfo.name || "User";

      const loadingMsg = await message.reply(`🔄 Getting ${name}'s profile picture...`);

      // Get the profile picture
      const imageStream = await this.getProfilePicture(targetID);

      await message.unsend(loadingMsg.messageID);

      if (imageStream) {
        return message.reply({
          body: `✅ ${name}'s Profile Picture`,
          attachment: imageStream
        });
      } else {
        return message.reply("❌ Failed to get profile picture. The user might have private settings.");
      }
    } catch (error) {
      console.error("Error in pfp command:", error);
      return message.reply("❌ An error occurred while getting the profile picture.");
    }
  },

  getProfilePicture: async function(userID) {
    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/facebookpfp?uid=${userID}&apikey=ff39a984-b238-45a6-ab29-97464691ea12`;
      
      const response = await axios({
        method: 'GET',
        url: apiUrl,
        responseType: 'stream',
        timeout: 10000
      });

      // Create temporary file
      const tempPath = path.join(__dirname, 'tmp', `pfp_${userID}_${Date.now()}.jpg`);
      const writer = fs.createWriteStream(tempPath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          resolve(fs.createReadStream(tempPath));
          // Schedule cleanup after 1 minute
          setTimeout(() => {
            fs.unlink(tempPath, (err) => {
              if (err) console.error("Error deleting temp file:", err);
            });
          }, 60000);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error("Error in getProfilePicture:", error);
      throw error;
    }
  }
};