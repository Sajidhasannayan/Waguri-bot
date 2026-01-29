const axios = require("axios");
const fs = require("fs");
const path = require("path");

const PLATFORMS = {
  'facebook.com': {
    name: 'Facebook',
    api: 'https://kaiz-apis.gleeze.com/api/fbdl',
    getMedia: (data) => ({
      url: data.videoUrl || data.download_url,
      title: data.title || "Facebook Video"
    })
  },
  'instagram.com': {
    name: 'Instagram',
    api: 'https://kaiz-apis.gleeze.com/api/insta-dl',
    getMedia: (data) => ({
      url: data.result?.video_url || data.video_url,
      title: data.result?.title || "Instagram Video"
    })
  },
  'youtube.com': {
    name: 'YouTube',
    api: 'https://kaiz-apis.gleeze.com/api/yt-down',
    getMedia: (data) => {
      const qualities = Object.keys(data.response || {}).sort((a, b) => parseInt(b) - parseInt(a));
      const best = qualities[0];
      return {
        url: data.response[best]?.download_url,
        title: data.response[best]?.title || "YouTube Video"
      };
    }
  },
  'twitter.com': {
    name: 'Twitter/X',
    api: 'https://kaiz-apis.gleeze.com/api/twitter-xdl',
    getMedia: (data) => {
      const videoLinks = data.downloadLinks?.filter(item => item.link && item.quality.includes('Download'));
      if (!videoLinks?.length) return {};
      const bestQuality = videoLinks[videoLinks.length - 1];
      return {
        url: bestQuality.link,
        title: data.title || "Twitter Video",
        quality: bestQuality.quality.replace('Download', '').trim()
      };
    }
  },
  'x.com': {
    name: 'Twitter/X',
    api: 'https://kaiz-apis.gleeze.com/api/twitter-xdl',
    getMedia: (data) => PLATFORMS['twitter.com'].getMedia(data)
  },
  'tiktok.com': {
    name: 'TikTok',
    api: 'https://kaiz-apis.gleeze.com/api/tiktok-dl',
    getMedia: (data) => ({
      url: data.url,
      title: data.title || "TikTok Video"
    })
  },
  'snapchat.com': {
    name: 'Snapchat',
    api: 'https://kaiz-apis.gleeze.com/api/snapchat-dl',
    getMedia: (data) => ({
      url: data.url,
      title: data.title || "Snapchat Spotlight"
    })
  },
  'reddit.com': {
    name: 'Reddit',
    api: 'https://kaiz-apis.gleeze.com/api/reddit-dl',
    getMedia: (data) => {
      const videos = data.mp4 || [];
      const bestQuality = videos.reduce((best, current) => 
        parseInt(current.quality) > parseInt(best?.quality || 0) ? current : best, {});
      return {
        url: bestQuality.url || data.url,
        title: data.title || "Reddit Video",
        quality: bestQuality.quality || ''
      };
    }
  }
};

const MAX_SIZE = 86 * 1024 * 1024; // 86MB
const API_KEY = process.env.KAIZ_API_KEY || "770f0df0-f042-4c9f-8e38-b25635565839";

module.exports = {
  config: {
    name: "download",
    aliases: ["dl"],
    version: "2.0",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    shortDescription: "Universal video downloader",
    description: {
      en: "download videos from url"
    },
    category: "media",
    guide: { en: "{pn} <URL>" }
  },

  onStart: async function ({ message, event, args }) {
    const url = args[0]?.trim();
    if (!url) return message.reply("🔍 Please provide a URL");

    const platform = Object.keys(PLATFORMS).find(d => url.includes(d));
    if (!platform) return message.reply("❌ Unsupported platform. Supported: " + 
      Object.values(PLATFORMS).map(p => p.name).filter((v,i,a) => a.indexOf(v) === i).join(", "));

    const { name, api, getMedia } = PLATFORMS[platform];
    message.reaction("⏳", event.messageID, () => {}, true);

    let tempPath;
    try {
      // 1. Fetch video info
      const apiUrl = `${api}?url=${encodeURIComponent(url)}&apikey=${API_KEY}`;
      console.log("API Request:", apiUrl);
      const { data } = await axios.get(apiUrl, { timeout: 30000 });
      console.log("API Response:", JSON.stringify(data, null, 2));
      
      // 2. Extract media URL
      const media = getMedia(data);
      if (!media?.url) throw new Error("No downloadable video found");
      
      // 3. Check size
      const head = await axios.head(media.url, { timeout: 15000 });
      const size = parseInt(head.headers['content-length']);
      if (size > MAX_SIZE) {
        throw new Error(`Video too large (${(size/1024/1024).toFixed(2)}MB)`);
      }

      // 4. Download
      tempPath = path.join(__dirname, `${name.replace('/', '-')}_${Date.now()}.mp4`);
      const writer = fs.createWriteStream(tempPath);
      const response = await axios({ 
        url: media.url, 
        responseType: "stream",
        timeout: 90000 // 90 seconds for large files
      });
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      // 5. Verify download
      const stats = fs.statSync(tempPath);
      if (stats.size === 0) throw new Error("Downloaded file is empty");
      if (stats.size > MAX_SIZE) throw new Error("File exceeded size limit after download");

      // 6. Send
      const messageBody = [
        `✅ ${media.title}`,
        `Platform: ${name}`,
        media.quality && `Quality: ${media.quality}`,
        `Size: ${(stats.size/1024/1024).toFixed(2)}MB`
      ].filter(Boolean).join('\n');

      await message.reply({
        body: messageBody,
        attachment: fs.createReadStream(tempPath)
      });
      message.reaction("✅", event.messageID, () => {}, true);

    } catch (err) {
      console.error(`[${name} Error]`, err);
      message.reply(`❌ Failed to download ${name} video:\n${err.message}`);
      message.reaction("❌", event.messageID, () => {}, true);
    } finally {
      if (tempPath && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupErr) {
          console.error("Cleanup error:", cleanupErr);
        }
      }
    }
  }
};