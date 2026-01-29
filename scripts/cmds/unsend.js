module.exports = {
  config: {
    name: "unsend",
    version: "2.1",
    author: "SajidMogged",
    countDown: 3,
    role: 0,
    shortDescription: {
      en: "Delete bot's messages (except Pokémon encounters)"
    },
    Description: {
      en: "Allows users to delete bot messages while protecting Pokémon encounter messages"
    },
    category: "box chat",
    guide: {
      en: "Reply to any bot message with /unsend"
    }
  },

  onStart: async function ({ message, event, api }) {
    try {
      // Check if reply exists
      if (!event.messageReply) {
        return message.reply("🔄 Please reply to the bot's message you want to delete");
      }

      const botID = api.getCurrentUserID();
      
      // Verify it's a bot message
      if (event.messageReply.senderID !== botID) {
        return message.reply("❌ Only bot's messages can be deleted");
      }

      // Prevent unsending Pokémon encounters
      const replyBody = event.messageReply.body || "";
      const hasPokemonArt = event.messageReply.attachments && 
        event.messageReply.attachments.some(att => 
          att.type === "photo" && 
          att.url && 
          att.url.includes("official-artwork")
        );

      const isPokemonEncounter = 
        replyBody.includes("wild Pokémon appeared") ||
        replyBody.includes("SHINY Pokémon appeared") ||
        hasPokemonArt;

      if (isPokemonEncounter) {
        return message.reply("⚠️ You can't delete Pokémon encounters! Catch or ignore them.");
      }

      // Dual deletion method for reliability
      await Promise.any([
        message.unsend(event.messageReply.messageID),
        api.deleteMessage(event.messageReply.messageID)
      ]);

    } catch (error) {
      console.error("Unsend Error:", error);
      await message.reply("❌ Failed to delete message. Try again later.");
    }
  }
};