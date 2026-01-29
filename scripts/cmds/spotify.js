const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "spotify",
    aliases: ["sp"],
    version: "1.0",
    author: "SajidMogged",
    countDown: 7,
    role: 0,
    shortDescription: "Search and download music from Spotify",
    Description: {
      en: "Search for music on Spotify and download tracks"
    },
    category: "music",
    guide: {
      en: "{pn} <search query>"
    }
  },

  onStart: async function ({ message, event, args, api }) {
    const query = args.join(" ");
    if (!query) return message.reply("Please provide a search query. Example: /spotify timeless");

    const API_KEY = process.env.KAIZ_API_KEY;
    if (!API_KEY) {
      return message.reply("❌ Spotify download service is currently unavailable. (Missing API key)");
    }

    try {
      const searchUrl = `https://kaiz-apis.gleeze.com/api/spotify-search?q=${encodeURIComponent(query)}&apikey=${API_KEY}`;
      const res = await axios.get(searchUrl);
      const results = res.data;

      if (!results || !results.length) {
        return message.reply("No results found for your query.");
      }

      const limitedResults = results.slice(0, 6);

      const text = limitedResults.map((track, i) => {
        return `${i + 1}. ${track.title}\n• Duration: ${track.duration}\n• Released: ${track.release_date}`;
      }).join("\n\n");

      const attachments = await Promise.all(
        limitedResults.map(track => global.utils.getStreamFromURL(track.thumbnail))
      );

      return message.reply(
        { body: `Reply with the number of the track you want to download:\n\n${text}`, attachment: attachments },
        (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: "spotify",
            messageID: info.messageID,
            author: event.senderID,
            data: limitedResults
          });
        }
      );
    } catch (err) {
      console.error(err);
      return message.reply("An error occurred while searching Spotify. Please try again later.");
    }
  },

  onReply: async function ({ event, Reply, api, message }) {
    if (event.senderID !== Reply.author) return;

    const choice = parseInt(event.body.trim());
    if (isNaN(choice) || choice < 1 || choice > Reply.data.length) {
      return api.unsendMessage(Reply.messageID);
    }

    api.unsendMessage(Reply.messageID);
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const selectedTrack = Reply.data[choice - 1];
    const API_KEY = process.env.KAIZ_API_KEY;

    try {
      const downloadUrl = `https://kaiz-apis.gleeze.com/api/spotify-down?url=${encodeURIComponent(selectedTrack.trackUrl)}&apikey=${API_KEY}`;
      const res = await axios.get(downloadUrl);
      const trackInfo = res.data;

      if (!trackInfo.url) {
        throw new Error("No download URL found");
      }

      const filePath = path.join(__dirname, "spotify.mp3");
      const writer = fs.createWriteStream(filePath);
      const response = await axios({
        url: trackInfo.url,
        method: "GET",
        responseType: "stream"
      });

      response.data.pipe(writer);

      writer.on("finish", () => {
        message.send(
          {
            body: `${trackInfo.title}`,
            attachment: fs.createReadStream(filePath)
          },
          () => {
            fs.unlinkSync(filePath);
            api.setMessageReaction("✅", event.messageID, () => {}, true);
          }
        );
      });

      writer.on("error", (err) => {
        console.error(err);
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        message.reply("Download failed. Please try again.");
      });
    } catch (err) {
      console.error(err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("Download error. Please try again later.");
    }
  }
};