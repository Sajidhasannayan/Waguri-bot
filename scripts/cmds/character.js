const axios = require('axios');
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "character",
    aliases: ["char"],
    version: "1.1",
    author: "SajidMogged",
    countDown: 15,
    role: 0,
    description: { en: "Get updated character information"
                 },
    category: "info",
    guide: "{pn} [character name]"
  },

  onStart: async function ({ message, args }) {
    try {
      const charName = args.join(" ");
      if (!charName) return message.reply("⚠️ Please enter a character name");

      message.reply("🔍 Searching character info...");

      // Updated GraphQL query with more fields
      const query = `
        query ($search: String) {
          Character(search: $search) {
            name {
              full
              native
              alternative
            }
            description(asHtml: false)
            image {
              large
            }
            media(sort: POPULARITY_DESC, perPage: 2) {
              nodes {
                title {
                  romaji
                  english
                }
                startDate {
                  year
                }
                siteUrl
              }
            }
            gender
            age
            dateOfBirth {
              year
              month
              day
            }
            favourites
            siteUrl
            updatedAt
          }
        }
      `;

      const { data } = await axios.post('https://graphql.anilist.co', {
        query,
        variables: { search: charName }
      });

      const character = data.data.Character;
      if (!character) return message.reply("❌ Character not found");

      // Custom age overrides for known characters
      const ageOverrides = {
        "Sanji": { baseAge: 19, postTimeskip: 21, timeskipYear: 2010 },
        "Monkey D. Luffy": { baseAge: 17, postTimeskip: 19, timeskipYear: 2010 },
        // Add more characters as needed
      };

      // Calculate current age
      let ageInfo = "";
      const charOverride = ageOverrides[character.name.full];
      if (charOverride) {
        const currentYear = new Date().getFullYear();
        const isPostTimeskip = character.media?.nodes?.some(m => m.startDate?.year >= charOverride.timeskipYear);
        
        ageInfo = isPostTimeskip 
          ? `🎂 Age: ${charOverride.postTimeskip} (Post-Timeskip)`
          : `🎂 Age: ${charOverride.baseAge} (Pre-Timeskip)`;
      } else if (character.age) {
        ageInfo = `🎂 Age: ${character.age}`;
      }

      // Format description
      const description = character.description 
        ? character.description
            .replace(/<[^>]*>/g, "")
            .replace(/\n/g, " ")
            .slice(0, 700) + (character.description.length > 700 ? "..." : "")
        : "No description available";

      // Last updated note
      const lastUpdated = character.updatedAt 
        ? `\n\nℹ️ Last updated: ${new Date(character.updatedAt * 1000).toLocaleDateString()}`
        : "\n\nℹ️ Data may not reflect latest story developments";

      // Build info message
      let infoMsg = `👤 𝗡𝗮𝗺𝗲: ${character.name.full}\n`;
      if (character.name.native) infoMsg += `🗾 𝗡𝗮𝘁𝗶𝘃𝗲: ${character.name.native}\n`;
      if (character.name.alternative?.length > 0) infoMsg += `🔤 𝗔𝗹𝘁. 𝗡𝗮𝗺𝗲𝘀: ${character.name.alternative.slice(0, 3).join(", ")}\n\n`;
      
      if (character.gender) infoMsg += `🚻 𝗚𝗲𝗻𝗱𝗲𝗿: ${character.gender}\n`;
      if (ageInfo) infoMsg += `${ageInfo}\n`;
      if (character.dateOfBirth?.month) {
        infoMsg += `📅 𝗕𝗶𝗿𝘁𝗵𝗱𝗮𝘆: ${formatBirthday(character.dateOfBirth)}\n`;
      }
      infoMsg += `❤️ 𝗙𝗮𝘃𝗼𝗿𝗶𝘁𝗲𝘀: ${character.favourites?.toLocaleString() || "0"}\n\n`;
      
      // Media appearances
      const mainMedia = character.media?.nodes?.[0];
      const secondMedia = character.media?.nodes?.[1];
      if (mainMedia) {
        infoMsg += `📺 𝗠𝗮𝗶𝗻 𝗔𝗽𝗽𝗲𝗮𝗿𝗮𝗻𝗰𝗲: ${mainMedia.title.romaji || mainMedia.title.english}`;
        if (mainMedia.startDate?.year) infoMsg += ` (${mainMedia.startDate.year})`;
        infoMsg += `\n`;
      }
      if (secondMedia) {
        infoMsg += `📺 𝗢𝘁𝗵𝗲𝗿 𝗔𝗽𝗽𝗲𝗮𝗿𝗮𝗻𝗰𝗲: ${secondMedia.title.romaji || secondMedia.title.english}`;
        if (secondMedia.startDate?.year) infoMsg += ` (${secondMedia.startDate.year})`;
        infoMsg += `\n`;
      }
      
      infoMsg += `\n📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻:\n${description}`;
      infoMsg += lastUpdated;
      infoMsg += `\n\n🔗 𝗠𝗼𝗿𝗲 𝗜𝗻𝗳𝗼: ${character.siteUrl}`;

      // Get character image
      let attachment = [];
      if (character.image?.large) {
        try {
          const imgStream = await getStreamFromURL(character.image.large);
          attachment.push(imgStream);
        } catch (e) {
          console.error("Image error:", e);
        }
      }

      await message.reply({
        body: infoMsg,
        attachment
      });

    } catch (err) {
      console.error("Character Error:", err);
      message.reply("❌ Error fetching character info. Try again later.");
    }
  }
};

// Improved birthday formatting
function formatBirthday(dob) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let str = "";
  if (dob.day) str += `${dob.day} `;
  if (dob.month) str += `${months[dob.month - 1]} `;
  if (dob.year) str += dob.year;
  return str.trim() || "Unknown";
}