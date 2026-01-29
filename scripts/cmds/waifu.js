const axios = require('axios');
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "waifu",
    aliases: ["wifu", "animegirl"],
    version: "1.0",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    description: {
      en: "Search for waifus"
    },
    category: "fun",
    guide: {
      en: "{pn} <name>\nExample: {pn} Rem"
    }
  },

  onStart: async function ({ message, args }) {
    try {
      const name = args.join(" ");
      if (!name) return message.reply("⚠️ Please specify a character name");

      // Search AniList for female character
      const searchQuery = `
        query ($search: String) {
          Character(search: $search) {
            name {
              full
            }
            image {
              large
            }
            gender
            description(asHtml: false)
            media {
              nodes {
                title {
                  romaji
                }
              }
            }
          }
        }
      `;

      const { data } = await axios.post('https://graphql.anilist.co', {
        query: searchQuery,
        variables: { search: name }
      });

      const character = data.data.Character;
      
      // Reject if male or not found
      if (!character || character.gender !== "Female") {
        return message.reply("❌ No female character found with that name");
      }

      // Format description
      const description = character.description 
        ? character.description.replace(/<[^>]*>/g, "").slice(0, 200) + "..."
        : "No description available";

      // Get anime source
      const sourceAnime = character.media?.nodes?.[0]?.title?.romaji || "Unknown anime";

      // Prepare message
      const messageText = `🌸 ${character.name.full}\n📺 From: ${sourceAnime}\n\n${description}`;

      // Send image with info
      const imgStream = await getStreamFromURL(character.image.large);
      await message.reply({
        body: messageText,
        attachment: imgStream
      });

    } catch (err) {
      console.error("Waifu Error:", err);
      message.reply("❌ Error searching for character. Try again later!");
    }
  }
};