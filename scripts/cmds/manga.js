const axios = require('axios');
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "manga",
    aliases: ["mangainfo"],
    version: "1.0",
    author: "SajidMogged",
    countDown: 15, // Added countDown like anime.js
    role: 0,
    description: { 
    en: "Get detailed manga information"
    },
    category: "anime",
    guide: "{pn} [manga name]"
  },

  onStart: async function ({ message, args }) {
    try {
      const mangaName = args.join(" ");
      if (!mangaName) return message.reply("⚠️ Please enter a manga name");

      message.reply("🔍 Searching manga info...");

      // AniList GraphQL Query
      const query = `
        query ($search: String) {
          Media(search: $search, type: MANGA) {
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
            staff(sort: RELEVANCE, perPage: 2) {
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
            format
            siteUrl
            nextAiringEpisode {
              airingAt
              timeUntilAiring
              episode
            }
          }
        }
      `;

      const { data } = await axios.post('https://graphql.anilist.co', {
        query,
        variables: { search: mangaName }
      });

      const manga = data.data.Media;
      if (!manga) return message.reply("❌ Manga not found");

      // Format description
      const description = manga.description 
        ? manga.description
            .replace(/<[^>]*>/g, "")
            .replace(/\n/g, " ")
            .slice(0, 700) + (manga.description.length > 700 ? "..." : "")
        : "No description available";

      // Format next chapter (if ongoing)
      let nextChapterText = "";
      if (manga.nextAiringEpisode) {
        const days = Math.floor(manga.nextAiringEpisode.timeUntilAiring / (24 * 60 * 60));
        const hours = Math.floor((manga.nextAiringEpisode.timeUntilAiring % (24 * 60 * 60)) / (60 * 60));
        nextChapterText = `\n⏳ Next Chapter: #${manga.nextAiringEpisode.episode} in ${days}d ${hours}h`;
      }

      // Main author
      const author = manga.staff?.nodes?.[0]?.name?.full || "Unknown";

      // Build info message (matching anime.js style)
      let infoMsg = `📚 𝗧𝗶𝘁𝗹𝗹𝗲: ${manga.title.romaji || manga.title.english}\n`;
      if (manga.title.english) infoMsg += `🏴 𝗘𝗻𝗴𝗹𝗶𝘀𝗵: ${manga.title.english}\n`;
      if (manga.title.native) infoMsg += `🗾 𝗡𝗮𝘁𝗶𝘃𝗲: ${manga.title.native}\n\n`;
      
      infoMsg += `✍️ 𝗔𝘂𝘁𝗵𝗼𝗿: ${author}\n`;
      infoMsg += `📌 𝗦𝘁𝗮𝘁𝘂𝘀: ${formatStatus(manga.status)}\n`;
      infoMsg += `📖 𝗖𝗵𝗮𝗽𝘁𝗲𝗿𝘀: ${manga.chapters || "Ongoing"}\n`;
      infoMsg += `📚 𝗩𝗼𝗹𝘂𝗺𝗲𝘀: ${manga.volumes || "Ongoing"}\n`;
      infoMsg += `⭐ 𝗥𝗮𝘁𝗶𝗻𝗴: ${manga.averageScore || "?"}/100\n`;
      infoMsg += `❤️ 𝗙𝗮𝘃𝗼𝗿𝗶𝘁𝗲𝘀: ${manga.favourites?.toLocaleString() || "0"}\n`;
      infoMsg += `🔥 𝗣𝗼𝗽𝘂𝗹𝗮𝗿𝗶𝘁𝘆: #${manga.popularity || "?"}\n\n`;
      
      infoMsg += `📅 𝗦𝘁𝗮𝗿𝘁𝗲𝗱: ${formatDate(manga.startDate)}\n`;
      if (manga.endDate.year) infoMsg += `📅 𝗘𝗻𝗱𝗲𝗱: ${formatDate(manga.endDate)}\n`;
      infoMsg += nextChapterText;
      
      infoMsg += `\n🏷️ 𝗚𝗲𝗻𝗿𝗲𝘀: ${manga.genres.join(", ") || "None"}\n\n`;
      infoMsg += `📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻:\n${description}\n\n`;
      infoMsg += `🔗 𝗠𝗼𝗿𝗲 𝗜𝗻𝗳𝗼: ${manga.siteUrl}`;

      // Get cover image
      let attachment = [];
      const imageUrl = manga.coverImage?.extraLarge || manga.coverImage?.large;
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
      console.error("Manga Error:", err);
      message.reply("❌ Error fetching manga info. Try again later.");
    }
  }
};

// Reused helper functions from anime.js
function formatDate(date) {
  if (!date.year) return "?";
  return `${date.year}-${date.month?.toString().padStart(2, '0') || "??"}-${date.day?.toString().padStart(2, '0') || "??"}`;
}

function formatStatus(status) {
  const statusMap = {
    'FINISHED': 'Finished',
    'RELEASING': 'Ongoing',
    'NOT_YET_RELEASED': 'Not Released',
    'CANCELLED': 'Cancelled',
    'HIATUS': 'Hiatus'
  };
  return statusMap[status] || status;
}