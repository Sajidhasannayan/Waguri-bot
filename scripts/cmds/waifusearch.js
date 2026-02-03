const axios = require('axios');

module.exports = {
  config: {
    name: "waifusearch",
    aliases: ["waifu", "animegirl", "husbando"],
    version: "1.0",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Search anime waifu/character details"
    },
    longDescription: {
      en: "Get detailed information about anime waifus/characters with images"
    },
    category: "anime",
    guide: {
      en: "{pn} <character name>\nExample: {pn} Saber\nExample: {pn} Yamato"
    }
  },

  onStart: async function ({ message, args }) {
    if (!args[0]) {
      return message.reply("Please provide a character name!\nExample: /waifubot Saber\nExample: /waifubot Yamato");
    }

    const searchQuery = args.join(" ").toLowerCase();
    
    try {
      message.reply("🔍 Searching for character information...");

      // Fetch waifu data from GitHub
      const response = await axios.get('https://raw.githubusercontent.com/JiachenRen/get_waifu/master/data/waifu_details.json');
      const waifuData = response.data;
      
      // Find matching character
      const foundWaifu = waifuData.find(character => 
        character.name.toLowerCase().includes(searchQuery) ||
        character.slug.toLowerCase().includes(searchQuery) ||
        character.original_name?.toLowerCase().includes(searchQuery) ||
        character.romaji_name?.toLowerCase().includes(searchQuery)
      );

      if (!foundWaifu) {
        // Try fuzzy search if exact match not found
        const fuzzyMatches = waifuData.filter(character => 
          character.name.toLowerCase().indexOf(searchQuery) !== -1 ||
          character.slug.toLowerCase().indexOf(searchQuery) !== -1 ||
          (character.original_name && character.original_name.toLowerCase().indexOf(searchQuery) !== -1) ||
          (character.romaji_name && character.romaji_name.toLowerCase().indexOf(searchQuery) !== -1)
        );

        if (fuzzyMatches.length === 0) {
          return message.reply(`❌ No character found for "${args.join(" ")}"\nTry a different name!`);
        }
        
        // If multiple matches, show list
        if (fuzzyMatches.length > 1) {
          let listMessage = `🔍 Found ${fuzzyMatches.length} characters matching "${args.join(" ")}":\n\n`;
          fuzzyMatches.slice(0, 10).forEach((char, index) => {
            listMessage += `${index + 1}. ${char.name}\n`;
            if (char.romaji_name) listMessage += `   (${char.romaji_name})\n`;
            if (char.series?.name) listMessage += `   From: ${char.series.name}\n`;
            listMessage += `   Use: /waifubot ${char.name}\n\n`;
          });
          
          if (fuzzyMatches.length > 10) {
            listMessage += `... and ${fuzzyMatches.length - 10} more results`;
          }
          
          return message.reply(listMessage);
        }
        
        // Use first fuzzy match
        foundWaifu = fuzzyMatches[0];
      }

      // Format character information
      let infoMessage = `🌸 **${foundWaifu.name}**\n`;
      
      if (foundWaifu.romaji_name) {
        infoMessage += `📛 Romaji: ${foundWaifu.romaji_name}\n`;
      }
      
      if (foundWaifu.original_name) {
        infoMessage += `🇯🇵 Original: ${foundWaifu.original_name}\n`;
      }
      
      // Physical stats
      if (foundWaifu.height) {
        infoMessage += `📏 Height: ${foundWaifu.height} cm\n`;
      }
      
      if (foundWaifu.weight) {
        infoMessage += `⚖️ Weight: ${foundWaifu.weight} kg\n`;
      }
      
      // Measurements
      const hasMeasurements = foundWaifu.bust || foundWaifu.waist || foundWaifu.hip;
      if (hasMeasurements) {
        infoMessage += `📐 Measurements: `;
        const measurements = [];
        if (foundWaifu.bust) measurements.push(`B:${foundWaifu.bust}`);
        if (foundWaifu.waist) measurements.push(`W:${foundWaifu.waist}`);
        if (foundWaifu.hip) measurements.push(`H:${foundWaifu.hip}`);
        infoMessage += measurements.join('-') + '\n';
      }
      
      // Birthday
      if (foundWaifu.birthday_month || foundWaifu.birthday_day) {
        let birthday = '';
        if (foundWaifu.birthday_month) birthday += `${foundWaifu.birthday_month}`;
        if (foundWaifu.birthday_day) birthday += `/${foundWaifu.birthday_day}`;
        if (foundWaifu.birthday_year) birthday += `/${foundWaifu.birthday_year}`;
        infoMessage += `🎂 Birthday: ${birthday}\n`;
      }
      
      // Age
      if (foundWaifu.age) {
        infoMessage += `🎭 Age: ${foundWaifu.age}\n`;
      }
      
      // Blood type
      if (foundWaifu.blood_type) {
        infoMessage += `💉 Blood Type: ${foundWaifu.blood_type}\n`;
      }
      
      // Origin
      if (foundWaifu.origin) {
        infoMessage += `🗺️ Origin: ${foundWaifu.origin}\n`;
      }
      
      // Series/Anime
      if (foundWaifu.series?.name) {
        infoMessage += `📺 Anime: ${foundWaifu.series.name}\n`;
      }
      
      // Popularity stats
      infoMessage += `\n⭐ **Popularity Stats:**\n`;
      infoMessage += `❤️ Likes: ${foundWaifu.likes?.toLocaleString() || 'N/A'}\n`;
      infoMessage += `🗑️ Trash: ${foundWaifu.trash?.toLocaleString() || 'N/A'}\n`;
      infoMessage += `🏆 Popularity Rank: #${foundWaifu.popularity_rank || 'N/A'}\n`;
      infoMessage += `👍 Like Rank: #${foundWaifu.like_rank || 'N/A'}\n`;
      
      // Tags if available
      if (foundWaifu.tags && foundWaifu.tags.length > 0) {
        infoMessage += `\n🏷️ Tags: ${foundWaifu.tags.slice(0, 5).join(', ')}`;
        if (foundWaifu.tags.length > 5) infoMessage += `...`;
        infoMessage += `\n`;
      }
      
      // NSFW warning
      if (foundWaifu.nsfw) {
        infoMessage += `\n⚠️ **NSFW Content Warning**\n`;
      }
      
      // Gender
      infoMessage += `\n👫 Gender: ${foundWaifu.husbando ? 'Husbando (Male)' : 'Waifu (Female)'}`;
      
      // Creator
      if (foundWaifu.creator?.name) {
        infoMessage += `\n🎨 Creator: ${foundWaifu.creator.name}`;
      }
      
      // URL
      if (foundWaifu.url) {
        infoMessage += `\n🔗 More Info: ${foundWaifu.url}`;
      }
      
      // Send message with image
      try {
        if (foundWaifu.display_picture) {
          await message.reply({
            body: infoMessage,
            attachment: await global.utils.getStreamFromURL(foundWaifu.display_picture)
          });
        } else {
          await message.reply(infoMessage);
        }
      } catch (imageError) {
        // If image fails, send text only
        console.log("Image error:", imageError.message);
        await message.reply(infoMessage + `\n\n📸 Image unavailable`);
      }
      
    } catch (error) {
      console.error("Waifubot error:", error);
      message.reply("❌ An error occurred while fetching character information. Please try again later.");
    }
  }
};
