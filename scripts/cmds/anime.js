const axios = require('axios');
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "anime",
    aliases: ["ani", "animeinfo"],
    version: "1.6",
    author: "SajidMogged",
    countDown: 15,
    role: 0,
    description: {
      en: "Get detailed anime information"
    },
    category: "anime",
    guide: {
      en: "{pn} [anime name]\nExample: {pn} One Piece"
    }
  },

  onStart: async function ({ message, args, getLang }) {
    try {
      const animeName = args.join(" ");
      if (!animeName) return message.reply("⚠️ Please enter an anime name");

      message.reply("🔍 Searching anime info...");

      // Enhanced GraphQL query with more fields
      const query = `
        query ($search: String) {
          Media(search: $search, type: ANIME) {
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
            episodes
            duration
            status
            averageScore
            meanScore
            popularity
            favourites
            genres
            studios(isMain: true) {
              nodes {
                name
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
            season
            seasonYear
            format
            source
            countryOfOrigin
            hashtag
            trailer {
              id
              site
              thumbnail
            }
            nextAiringEpisode {
              airingAt
              timeUntilAiring
              episode
            }
            relations {
              edges {
                relationType
                node {
                  title {
                    romaji
                    english
                  }
                  siteUrl
                }
              }
            }
            recommendations {
              nodes {
                mediaRecommendation {
                  title {
                    romaji
                  }
                  siteUrl
                }
              }
            }
            siteUrl
          }
        }
      `;

      const { data } = await axios.post('https://graphql.anilist.co', {
        query,
        variables: { search: animeName }
      });

      const anime = data.data.Media;
      if (!anime) return message.reply("❌ Anime not found");

      // Format description
      const description = anime.description 
        ? anime.description
            .replace(/<[^>]*>/g, "")
            .replace(/\n/g, " ")
            .slice(0, 700) + (anime.description.length > 700 ? "..." : "")
        : "No description available";

      // Format relations
      let relationsText = "";
      if (anime.relations?.edges?.length > 0) {
        relationsText = anime.relations.edges
          .slice(0, 3) // Limit to 3 relations
          .map(edge => `${edge.relationType}: ${edge.node.title.romaji}`)
          .join("\n");
      }

      // Format recommendations
      let recommendationsText = "";
      if (anime.recommendations?.nodes?.length > 0) {
        recommendationsText = anime.recommendations.nodes
          .slice(0, 3) // Limit to 3 recommendations
          .map(node => `- ${node.mediaRecommendation.title.romaji}`)
          .join("\n");
      }

      // Format next episode (if airing)
      let nextEpisodeText = "";
      if (anime.nextAiringEpisode) {
        const days = Math.floor(anime.nextAiringEpisode.timeUntilAiring / (24 * 60 * 60));
        const hours = Math.floor((anime.nextAiringEpisode.timeUntilAiring % (24 * 60 * 60)) / (60 * 60));
        nextEpisodeText = `\n⏳ Next Episode: #${anime.nextAiringEpisode.episode} in ${days}d ${hours}h`;
      }

      // Main studio
      const studio = anime.studios?.nodes?.[0]?.name || "Unknown";

      // Build detailed info message
      let infoMsg = `🎌 𝗧𝗶𝘁𝗹𝗲: ${anime.title.romaji || anime.title.english}\n`;
      if (anime.title.english) infoMsg += `🏴 𝗘𝗻𝗴𝗹𝗶𝘀𝗵: ${anime.title.english}\n`;
      if (anime.title.native) infoMsg += `🗾 𝗡𝗮𝘁𝗶𝘃𝗲: ${anime.title.native}\n\n`;
      
      infoMsg += `📌 𝗦𝘁𝗮𝘁𝘂𝘀: ${formatStatus(anime.status)}\n`;
      infoMsg += `📺 𝗘𝗽𝗶𝘀𝗼𝗱𝗲𝘀: ${anime.episodes || "Unknown"} (${anime.duration || "?"} min/ep)\n`;
      infoMsg += `⭐ 𝗥𝗮𝘁𝗶𝗻𝗴: ${anime.averageScore || "?"}/100 (${anime.meanScore || "?"} mean)\n`;
      infoMsg += `❤️ 𝗙𝗮𝘃𝗼𝗿𝗶𝘁𝗲𝘀: ${anime.favourites?.toLocaleString() || "0"}\n`;
      infoMsg += `🔥 𝗣𝗼𝗽𝘂𝗹𝗮𝗿𝗶𝘁𝘆: #${anime.popularity || "?"}\n\n`;
      
      infoMsg += `🎬 𝗙𝗼𝗿𝗺𝗮𝘁: ${formatType(anime.format)}\n`;
      infoMsg += `🎥 𝗦𝗼𝘂𝗿𝗰𝗲: ${formatSource(anime.source)}\n`;
      infoMsg += `🏢 𝗦𝘁𝘂𝗱𝗶𝗼: ${studio}\n`;
      infoMsg += `🌐 𝗖𝗼𝘂𝗻𝘁𝗿𝘆: ${anime.countryOfOrigin || "Japan"}\n\n`;
      
      infoMsg += `🗓️ 𝗔𝗶𝗿𝗲𝗱: ${formatDate(anime.startDate)} to ${formatDate(anime.endDate)}\n`;
      if (anime.season) infoMsg += `🍂 𝗦𝗲𝗮𝘀𝗼𝗻: ${formatSeason(anime.season)} ${anime.seasonYear || ""}\n`;
      infoMsg += nextEpisodeText;
      
      infoMsg += `\n🏷️ 𝗚𝗲𝗻𝗿𝗲𝘀: ${anime.genres.join(", ")}\n\n`;
      infoMsg += `📝 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝘁𝗶𝗼𝗻:\n${description}\n\n`;
      
      if (relationsText) infoMsg += `🔗 𝗥𝗲𝗹𝗮𝘁𝗶𝗼𝗻𝘀:\n${relationsText}\n\n`;
      if (recommendationsText) infoMsg += `💡 𝗥𝗲𝗰𝗼𝗺𝗺𝗲𝗻𝗱𝗲𝗱:\n${recommendationsText}\n\n`;
      
      infoMsg += `🔗 𝗠𝗼𝗿𝗲 𝗜𝗻𝗳𝗼: ${anime.siteUrl}`;
      if (anime.trailer?.id) infoMsg += `\n🎬 𝗧𝗿𝗮𝗶𝗹𝗲𝗿: https://youtube.com/watch?v=${anime.trailer.id}`;

      // Get high-quality cover image
      let attachment = [];
      const imageUrl = anime.coverImage.extraLarge || anime.coverImage.large;
      if (imageUrl) {
        try {
          const imgStream = await getStreamFromURL(imageUrl);
          attachment.push(imgStream);
        } catch (e) {
          console.error("Image load error:", e);
        }
      }

      // Send results
      await message.reply({
        body: infoMsg,
        attachment
      });

    } catch (err) {
      console.error("Anime Error:", err);
      message.reply("❌ Error fetching anime info. Try again later.");
    }
  }
};

// Helper functions
function formatDate(date) {
  if (!date.year) return "?";
  return `${date.year}-${date.month?.toString().padStart(2, '0') || "??"}-${date.day?.toString().padStart(2, '0') || "??"}`;
}

function formatStatus(status) {
  const statusMap = {
    'FINISHED': 'Finished',
    'RELEASING': 'Ongoing',
    'NOT_YET_RELEASED': 'Not Yet Released',
    'CANCELLED': 'Cancelled',
    'HIATUS': 'Hiatus'
  };
  return statusMap[status] || status;
}

function formatType(type) {
  const typeMap = {
    'TV': 'TV Series',
    'TV_SHORT': 'TV Short',
    'MOVIE': 'Movie',
    'SPECIAL': 'Special',
    'OVA': 'OVA',
    'ONA': 'ONA',
    'MUSIC': 'Music'
  };
  return typeMap[type] || type;
}

function formatSource(source) {
  const sourceMap = {
    'ORIGINAL': 'Original',
    'MANGA': 'Manga',
    'LIGHT_NOVEL': 'Light Novel',
    'VISUAL_NOVEL': 'Visual Novel',
    'VIDEO_GAME': 'Video Game',
    'NOVEL': 'Novel',
    'DOUJINSHI': 'Doujinshi',
    'ANIME': 'Anime'
  };
  return sourceMap[source] || source;
}

function formatSeason(season) {
  const seasonMap = {
    'WINTER': 'Winter',
    'SPRING': 'Spring',
    'SUMMER': 'Summer',
    'FALL': 'Fall'
  };
  return seasonMap[season] || season;
}