const axios = require("axios");
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "wikipedia",
    aliases: ["wiki"],
    version: "1.5",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    description: {
      en: "Search Wikipedia for free",
      bn: "উইকিপিডিয়া অনুসন্ধান করুন (ইংরেজি/বাংলা)"
    },
    category: "info",
    guide: {
      en: "{pn} <search term> [--bn]"
        + "\nExample:"
        + "\n{pn} Bangladesh"
        + "\n{pn} বাংলাদেশ --bn",
      bn: "{pn} <অনুসন্ধানের শব্দ> [--bn]"
        + "\nউদাহরণ:"
        + "\n{pn} Bangladesh"
        + "\n{pn} বাংলাদেশ --bn"
    }
  },

  langs: {
    en: {
      missingKeyword: "Please enter a search term",
      noResult: "No Wikipedia article found for: %1",
      error: "An error occurred while searching Wikipedia"
    },
    bn: {
      missingKeyword: "অনুসন্ধানের জন্য একটি শব্দ লিখুন",
      noResult: "%1-এর জন্য কোন উইকিপিডিয়া নিবন্ধ পাওয়া যায়নি",
      error: "উইকিপিডিয়া অনুসন্ধান করতে সমস্যা হয়েছে"
    }
  },

  onStart: async function ({ message, event, args, getLang }) {
    // Check if user wants Bangla results
    const langArgIndex = args.findIndex(arg => arg === "--bn");
    const useBangla = langArgIndex !== -1;
    if (useBangla) {
      args.splice(langArgIndex, 1); // Remove --bn flag from search terms
    }

    if (!args[0]) {
      return message.reply(getLang("missingKeyword"));
    }

    // Process Wikipedia search
    const searchTerm = args.join(" ");
    const langCode = useBangla ? "bn" : "en";
    const apiUrl = `https://${langCode}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`;

    try {
      const response = await axios.get(apiUrl);
      const data = response.data;

      if (data.title && data.extract) {
        let messageBody = `📚 Wikipedia (${useBangla ? "বাংলা" : "English"}): ${data.title}\n\n`;
        messageBody += `${data.extract}\n\n`;
        messageBody += `🔗 Read more: ${data.content_urls.desktop.page}`;

        let attachment = [];
        if (data.thumbnail && data.thumbnail.source) {
          try {
            const imageStream = await getStreamFromURL(data.thumbnail.source);
            attachment.push(imageStream);
          } catch (imageError) {
            console.error("Image download failed:", imageError);
          }
        }

        await message.reply({
          body: messageBody,
          attachment: attachment
        });
      } else {
        await message.reply(getLang("noResult", searchTerm));
      }
    } catch (err) {
      console.error("Wikipedia Error:", err);
      const errorMsg = err.response?.status === 404 
        ? getLang("noResult", searchTerm)
        : getLang("error");
      await message.reply(errorMsg);
    }
  }
};