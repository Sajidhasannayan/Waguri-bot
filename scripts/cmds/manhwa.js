const axios = require('axios');
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "manhwa",
    aliases: ["manhwainfo"],
    version: "1.0",
    author: "SajidMogged",
    countDown: 15,
    role: 0,
    description: "Get detailed manhwa information",
    category: "anime",
    guide: "{pn} [manhwa title]"
  },

  onStart: async function ({ message, args }) {
    try {
      const manhwaName = args.join(" ");
      if (!manhwaName) return message.reply("⚠️ Please enter a manhwa title");

      message.reply("🔍 Searching manhwa info...");

      // AniList GraphQL Query (optimized for manhwa)
      const query = `
        query ($search: String) {
          Media(search: $search, type: MANGA, countryOfOrigin: KR) {
            title {
              romaji
              english
              native
            }
            description(asHtml: false)
            coverImage {
              extraLarge
              large
              color
            }
            bannerImage
            chapters
            volumes
            status
            averageScore
            meanScore
            popularity
            favourites
            genres
            staff(sort: RELEVANCE, perPage: 1) {
              nodes {
                name {
                  full
                }
              }
            }
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
            siteUrl
            isAdult
            source
            hashtag
          }
        }
      `;

      const { data } = await axios.post('https://graphql.anilist.co', {
        query,
        variables: { search: manhwaName }
      });

      const manhwa = data.data.Media;
      if (!manhwa) return message.reply("❌ Manhwa not found. Try a different title or check spelling.");

      // Format description
      const description = manhwa.description 
        ? manhwa.description
            .replace(/<[^>]*>/g, "")
            .replace(/\n/g, " ")
            .slice(0, 700) + (manhwa.description.length > 700 ? "..." : "")
        : "No description available";

      // Main author (first staff member)
      const author = manhwa.staff?.nodes?.[0]?.name?.full || "Unknown";

      // Build info message (manhwa-specific)
      let infoMsg = `🇰🇷 𝗠𝗮𝗻𝗵𝘄𝗮: ${manhwa.title.romaji || manhwa.title.english}\n`;
      if (manhwa.title.english) infoMsg += `🏴 𝗘𝗻𝗴𝗹𝗶𝘀𝗵: ${manhwa.title.english}\n`;
      if (manhwa.title.native) infoMsg += `🅱️ 𝗡𝗮𝘁𝗶𝘃𝗲: ${manhwa.title.native}\n\n`;
      
      infoMsg += `✍️ 𝗔𝘂𝘁𝗵𝗼𝗿: ${author}\n`;
      infoMsg += `📌 𝗦𝘁𝗮𝘁𝘂𝘀: ${formatStatus(manhwa.status)}\n`;
      infoMsg += `📖 𝗖𝗵𝗮𝗽𝘁𝗲𝗿𝘀: ${manhwa.chapters || "Ongoing"}\n`;
      infoMsg += `📚 𝗩𝗼𝗹𝘂𝗺𝗲𝘀: ${manhwa.volumes || "Ongoing"}\n`;
      infoMsg += `⭐ 𝗥𝗮𝘁𝗶𝗻𝗴: ${manhwa.averageScore || "?"}/100\n`;
      infoMsg += `❤️ 𝗙𝗮𝘃𝗼𝗿𝗶𝘁𝗲𝘀: ${manhwa.favourites?.toLocaleString() || "0"}\n\n`;
      
      infoMsg += `📅 𝗦𝘁𝗮𝗿𝘁𝗲𝗱: ${formatDate(manhwa.startDate)}\n`;
      if (manhwa.endDate?.year) infoMsg += `📅 𝗘𝗻𝗱𝗲𝗱: ${formatDate(manhwa.endDate)}\n\n`;
      
      infoMsg += `🏷️ 𝗚𝗲𝗻𝗿𝗲𝘀: ${manhwa.genres.join(", ") || "None"}\n`;
      if (manhwa.source) infoMsg += `📜 𝗦𝗼𝘂𝗿𝗰𝗲: ${formatSource(manhwa.source)}\n`;
      if (manhwa.isAdult) infoMsg += `🔞 𝗔𝗱𝘂𝗹𝘁: Yes\n\n`;
      
      infoMsg += `📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻:\n${description}\n\n`;
      infoMsg += `🔗 𝗠𝗼𝗿𝗲 𝗜𝗻𝗳𝗼: ${manhwa.siteUrl}`;

      // Get cover image
      let attachment = [];
      const imageUrl = manhwa.coverImage?.extraLarge || manhwa.coverImage?.large;
      if (imageUrl) {
        try {
          const imgStream = await getStreamFromURL(imageUrl);
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
      console.error("Manhwa Error:", err);
      message.reply("❌ Error fetching manhwa info. Try again later.");
    }
  }
};

// Reused helper functions with additions
function formatDate(date) {
  if (!date.year) return "?";
  return `${date.year}-${date.month?.toString().padStart(2, '0') || "??"}-${date.day?.toString().padStart(2, '0') || "??"}`;
}

function formatStatus(status) {
  const statusMap = {
    'FINISHED': 'Completed',
    'RELEASING': 'Ongoing',
    'NOT_YET_RELEASED': 'Upcoming',
    'CANCELLED': 'Cancelled',
    'HIATUS': 'Hiatus'
  };
  return statusMap[status] || status;
}

function formatSource(source) {
  const sourceMap = {
    'ORIGINAL': 'Original',
    'MANGA': 'Manga',
    'LIGHT_NOVEL': 'Light Novel',
    'WEB_NOVEL': 'Web Novel',
    'DOUJINSHI': 'Doujinshi'
  };
  return sourceMap[source] || source;
}