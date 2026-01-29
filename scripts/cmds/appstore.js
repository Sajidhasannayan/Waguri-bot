const axios = require("axios");
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "appstore",
    version: "1.5",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    description: {
      vi: "Tìm app trên appstore",
      en: "Search app on appstore"
    },
    category: "info",
    guide: "{pn}: <keyword>\n- Example:\n{pn} PUBG",
    envConfig: {
      limitResult: 3
    }
  },

  langs: {
    vi: {
      missingKeyword: "Bạn chưa nhập từ khóa",
      noResult: "Không tìm thấy kết quả nào cho từ khóa %1",
      apiError: "Lỗi kết nối đến App Store"
    },
    en: {
      missingKeyword: "You haven't entered any keyword",
      noResult: "No result found for keyword %1",
      apiError: "Connection error to App Store"
    }
  },

  onStart: async function ({ message, args, commandName, envCommands, getLang }) {
    if (!args[0]) return message.reply(getLang("missingKeyword"));

    try {
      // Add slight delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data } = await axios.get("https://itunes.apple.com/search", {
        params: {
          term: args.join(" "),
          entity: "software",
          limit: envCommands[commandName].limitResult,
          country: "US" // Change as needed
        },
        timeout: 10000 // 10 seconds timeout
      });

      if (!data.results || data.results.length === 0) {
        return message.reply(getLang("noResult", args.join(" ")));
      }

      const formattedResults = await Promise.all(
        data.results.map(async result => {
          const image = await getStreamFromURL(
            result.artworkUrl512 || result.artworkUrl100 || result.artworkUrl60
          ).catch(() => null);

          return {
            text: `- ${result.trackCensoredName} by ${result.artistName}\n` +
                  `- Price: ${result.formattedPrice || 'Free'}\n` +
                  `- Rating: ${"⭐".repeat(Math.floor(result.averageUserRating || 0))} ` +
                  `(${(result.averageUserRating || 0).toFixed(1)}/5)\n` +
                  `- URL: ${result.trackViewUrl}`,
            image
          };
        })
      );

      await message.reply({
        body: formattedResults.map(r => r.text).join("\n\n"),
        attachment: formattedResults.filter(r => r.image).map(r => r.image)
      });

    } catch (err) {
      console.error("AppStore Error:", err);
      const errorMsg = err.response?.status === 404 
        ? getLang("apiError") 
        : getLang("noResult", args.join(" "));
      message.reply(errorMsg);
    }
  }
};