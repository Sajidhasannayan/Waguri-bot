const axios = require('axios');
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin"],
    version: "1.5",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    description: {
      en: "Get random Pinterest images"
    },
    category: "image",
    guide: {
      en: "{pn} <search> -<number (1-10)>\nExample: {pn} waifu -5"
    }
  },

  langs: {
    en: {
      missingInput: "🔍 Please enter a search term (e.g., 'waifu')",
      invalidNumber: "❌ Please use a number between 1-10 (e.g., 'waifu -5')",
      noResult: "⚠️ No images found for: %1",
      results: "📌 Here are your %1 random images for \"%2\":"
    }
  },

  onStart: async function ({ message, args, getLang }) {
    try {
      // Parse input
      const fullQuery = args.join(" ");
      const match = fullQuery.match(/^(.*?)(?:\s*-(\d+))?$/);
      
      if (!match || !match[1]) {
        return message.reply(getLang("missingInput"));
      }

      const searchTerm = match[1].trim();
      let numImages = match[2] ? parseInt(match[2]) : 5;
      
      // Validate number
      if (isNaN(numImages) || numImages < 1 || numImages > 10) {
        return message.reply(getLang("invalidNumber"));
      }

      // Add timestamp to prevent caching
      const timestamp = Date.now();
      const apiUrl = `https://kaiz-apis.gleeze.com/api/pinterest?search=${encodeURIComponent(searchTerm)}&timestamp=${timestamp}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      
      // Fetch API with timeout and no-cache headers
      const { data } = await axios.get(apiUrl, {
        timeout: 10000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!data?.data?.length) {
        return message.reply(getLang("noResult", searchTerm));
      }

      // Get UNIQUE links & shuffle randomly
      const uniqueLinks = [...new Set(data.data)];
      const shuffled = uniqueLinks.sort(() => Math.random() - 0.5);
      const selectedUrls = shuffled.slice(0, numImages);

      // Download images (parallel)
      const attachments = await Promise.all(
        selectedUrls.map(url => 
          getStreamFromURL(url).catch(() => null)
        )
      ).then(results => results.filter(Boolean));

      if (!attachments.length) {
        return message.reply(getLang("noResult", searchTerm));
      }

      // Send results directly
      await message.reply({
        body: getLang("results", attachments.length, searchTerm),
        attachment: attachments
      });

    } catch (err) {
      console.error("Pinterest Error:", err);
      await message.reply(
        err.response?.status ? 
        `⚠️ API Error (Status: ${err.response.status})` : 
        "❌ Failed to fetch images. Try again later."
      );
    }
  }
};