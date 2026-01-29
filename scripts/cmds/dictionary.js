const axios = require("axios");

module.exports = {
  config: {
    name: "dictionary",
    version: "1.0",
    author: "SajidMogged",
    countDown: 3,
    role: 0,
    description: {
      en: "Search the dictionary for a word's meaning"
    },
    category: "info",
    guide: {
      en: "{pn} <word> - Look up word meaning"
    }
  },

  onStart: async function ({ event, message, args, api }) {
    const word = args.join(" ").trim();
    if (!word) return message.reply("Please provide a word to look up.");

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const url = `https://kaiz-apis.gleeze.com/api/dictionary?word=${encodeURIComponent(word)}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      const { data } = await axios.get(url, { timeout: 15000 });

      if (!data || data.error || !data.word) {
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        return message.reply("❌ Word not found in the dictionary.");
      }

      const lines = [];

      lines.push(`📖 𝗪𝗼𝗿𝗱: *${data.word}*`);
      if (data.phonetic) lines.push(`🗣️ 𝗣𝗵𝗼𝗻𝗲𝘁𝗶𝗰: /${data.phonetic}/`);
      if (data.origin) lines.push(`📜 𝗢𝗿𝗶𝗴𝗶𝗻: ${data.origin}`);

      if (data.meanings && data.meanings.length > 0) {
        for (const meaning of data.meanings) {
          lines.push(`\n🔹 *${meaning.partOfSpeech}*`);

          if (meaning.definitions?.length) {
            meaning.definitions.forEach((def, i) => {
              lines.push(`  ${i + 1}. ${def.definition}`);
              if (def.example) {
                lines.push(`     ✏️ _Example:_ "${def.example}"`);
              }
            });
          }
        }
      }

      api.setMessageReaction("✅", event.messageID, () => {}, true);
      return message.reply(lines.join("\n"));
    } catch (err) {
      console.error("Dictionary error:", err.message || err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("❌ Failed to fetch dictionary data.");
    }
  }
};