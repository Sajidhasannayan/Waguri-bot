const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "ytb",
    aliases: ["youtube"],
    version: "2.0",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    shortDescription: "Download YouTube video or audio",
    Description: {
      en: "download youtube audio or video"
    },
    category: "media",
    guide: {
      en: "{pn} -v/-a <title or YouTube link>"
    }
  },

  onStart: async function ({ message, event, args, api }) {
    const input = args.join(" ");
    if (!input) return message.reply("Use: /ytb -v|-a <video name or link>");

    const mode = args[0];
    const query = args.slice(1).join(" ");

    if (!["-v", "-a", "video", "audio"].includes(mode) || !query) {
      return message.reply("Usage: /ytb -v|-a <video name or link>");
    }

    const isUrl = query.includes("youtube.com") || query.includes("youtu.be");

    if (!isUrl) {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const res = await axios.get(searchUrl);
      const rawJson = res.data.split("ytInitialData = ")[1].split(";</script>")[0];
      const json = JSON.parse(rawJson);
      const videos = json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;

      const results = videos
        .filter(item => item.videoRenderer)
        .slice(0, 6)
        .map(item => {
          const v = item.videoRenderer;
          return {
            id: v.videoId,
            title: v.title.runs[0].text,
            duration: v.lengthText?.simpleText || "Live",
            channel: v.ownerText.runs[0].text,
            thumbnail: v.thumbnail.thumbnails.pop().url
          };
        });

      if (!results.length) return message.reply("No results found.");

      const text = results.map((v, i) => {
        return `${i + 1}. ${v.title}\n• Duration: ${v.duration}\n• Channel: ${v.channel}`;
      }).join("\n\n");

      const attachments = await Promise.all(results.map(v => global.utils.getStreamFromURL(v.thumbnail)));

      return message.reply(
        { body: `Reply with a number or number + quality (e.g., 1 or 1 360):\n\n${text}`, attachment: attachments },
        (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: "ytb",
            messageID: info.messageID,
            author: event.senderID,
            data: results,
            mode
          });
        }
      );
    } else {
      handleDownload({ message, event, api, url: query, mode });
    }
  },

  onReply: async function ({ event, Reply, api, message }) {
    if (event.senderID !== Reply.author) return;

    const parts = event.body.trim().split(" ");
    const choice = parseInt(parts[0]);
    const quality = parts[1] === "360" ? "360p" : "720p";

    if (isNaN(choice) || choice < 1 || choice > Reply.data.length) {
      return api.unsendMessage(Reply.messageID);
    }

    api.unsendMessage(Reply.messageID);

    const selected = Reply.data[choice - 1];
    const url = `https://youtube.com/watch?v=${selected.id}`;
    handleDownload({ message, event, api, url, mode: Reply.mode, forceQuality: quality, replyTo: event.messageID });
  }
};

async function handleDownload({ message, event, api, url, mode, forceQuality, replyTo }) {
  api.setMessageReaction("⏳", event.messageID, () => {}, true);

  const isAudio = mode === "-a" || mode === "audio";
  const maxSize = 83 * 1024 * 1024;
  const API_KEY = process.env.KAIZ_API_KEY; // Get API key from Replit Secrets

  if (!API_KEY) {
    return message.reply("❌ YouTube download service is currently unavailable. (Missing API key)");
  }

  try {
    const apiUrl = isAudio
      ? `https://kaiz-apis.gleeze.com/api/ytdown-mp3?url=${encodeURIComponent(url)}&apikey=${API_KEY}`
      : `https://kaiz-apis.gleeze.com/api/yt-down?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;

    const res = await axios.get(apiUrl);
    const data = res.data;

    let downloadUrl, title, selectedQuality;

    if (isAudio) {
      downloadUrl = data.download_url;
      title = data.title || "YouTube Audio";
    } else {
      const qualityKey = forceQuality || "720p";
      const stream = data.response[qualityKey];
      if (!stream) return message.reply(`❌ ${qualityKey} is not available for this video.`);

      const head = await axios.head(stream.download_url);
      const size = parseInt(head.headers["content-length"]);
      if (size > maxSize) return message.reply("❌ Selected quality is too large to send on Messenger.");

      downloadUrl = stream.download_url;
      title = stream.title;
      selectedQuality = qualityKey;
    }

    const filePath = path.join(__dirname, isAudio ? "audio.mp3" : "video.mp4");
    const writer = fs.createWriteStream(filePath);
    const response = await axios({ url: downloadUrl, method: "GET", responseType: "stream" });
    response.data.pipe(writer);

    writer.on("finish", () => {
      message.send(
        {
          body: `${title}${selectedQuality ? ` (${selectedQuality})` : ""}`,
          attachment: fs.createReadStream(filePath)
        },
        () => {
          fs.unlinkSync(filePath);
          api.setMessageReaction("✅", event.messageID, () => {}, true);
        },
        replyTo
      );
    });

    writer.on("error", () => {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("Download failed.");
    });
  } catch (err) {
    console.error(err);
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    message.reply("Download error. Please try again later.");
  }
}