const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "lyrics",
    version: "1.1",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Get song lyrics"
    },
    longDescription: {
      en: "Get lyrics for any song by title"
    },
    category: "music",
    guide: {
      en: "{pn} <song title>"
    }
  },

  onStart: async function ({ message, args }) {
    try {
      const songTitle = args.join(" ");
      
      if (!songTitle) {
        return message.reply("⚠️ Please enter a song title. Example: /lyrics Summertime Sadness");
      }

      const loadingMsg = await message.reply(`🔍 Searching lyrics for "${songTitle}"...`);

      // Call the Kaiz API
      const result = await this.getLyrics(songTitle);

      // Delete loading message
      await message.unsend(loadingMsg.messageID);

      if (result && result.lyrics) {
        // Extract artist from title if available (format: "Artist - Song Title")
        const titleParts = result.title.split(" - ");
        const artist = titleParts.length > 1 ? titleParts[0] : "Unknown artist";
        const cleanTitle = titleParts.length > 1 ? titleParts[1] : result.title;
        
        // Format the lyrics to fit within message character limits
        const formattedLyrics = this.formatLyrics(result.lyrics);
        
        // Create a temporary text file if lyrics are too long
        if (formattedLyrics.length > 2000) {
          const tempFilePath = path.join(__dirname, 'tmp', `lyrics_${Date.now()}.txt`);
          fs.writeFileSync(tempFilePath, `🎵 ${cleanTitle}\n\n${formattedLyrics}`);
          
          return message.reply({
            body: `🎶 ${cleanTitle}\n👤 Artist: ${artist}`,
            attachment: fs.createReadStream(tempFilePath)
          }, () => {
            // Delete the temporary file after sending
            fs.unlink(tempFilePath, (err) => {
              if (err) console.error("Error deleting temp file:", err);
            });
          });
        }
        else {
          return message.reply(`🎶 ${cleanTitle}\n👤 Artist: ${artist}\n\n${formattedLyrics}`);
        }
      } else {
        return message.reply(`❌ Couldn't find lyrics for "${songTitle}". Please try a different title.`);
      }
    } catch (error) {
      console.error("Error in lyrics command:", error);
      return message.reply("❌ An error occurred while fetching lyrics. Please try again later.");
    }
  },

  getLyrics: async function(songTitle) {
    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/lyrics?title=${encodeURIComponent(songTitle)}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      
      const response = await axios.get(apiUrl);
      
      // Return the data if it has lyrics
      if (response.data && response.data.lyrics) {
        return {
          title: response.data.title || songTitle,
          lyrics: response.data.lyrics,
          thumbnail: response.data.thumbnail
        };
      }
      return null;
    } catch (error) {
      console.error("Error in getLyrics:", error);
      return null;
    }
  },

  formatLyrics: function(lyrics) {
    // Basic formatting to make lyrics more readable
    return lyrics
      .replace(/\n\n/g, '\n') // Remove extra newlines
      .replace(/(\[.*?\])/g, '\n$1\n') // Add space around [Verse], [Chorus] etc.
      .trim();
  }
};