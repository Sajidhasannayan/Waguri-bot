const fs = require("fs");
const axios = require("axios");
const path = require("path");

module.exports = {
  config: {
    name: "pokechamps",
    aliases: ["pokemasters", "elite8"],
    version: "4.0",
    author: "SajidMogged",
    countDown: 10, // Increased due to API calls
    role: 0,
    shortDescription: "Top 8 Masters",
    longDescription: {
      en: "Top 8 trainers"
    },
    category: "pokebot",
    guide: { en: "{pn}" }
  },

  onStart: async function ({ message, event, usersData }) {
    const filePath = './caughtPokemon.json';
    if (!fs.existsSync(filePath)) {
      return message.reply("No Pokémon data found. Catch some first!");
    }

    try {
      const caughtPokemon = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const threadUsers = Object.keys(caughtPokemon).filter(uid => 
        caughtPokemon[uid]?.length > 0
      );

      if (threadUsers.length === 0) {
        return message.reply("No trainers have Pokémon yet!");
      }

      // Fetch stats for all unique Pokémon in thread
      const pokemonStatsCache = {};
      const allPokemonIds = [...new Set(
        threadUsers.flatMap(uid => 
          caughtPokemon[uid].map(p => p.id)
        )
      )];

      await Promise.all(
        allPokemonIds.map(async id => {
          try {
            const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
            pokemonStatsCache[id] = data.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
          } catch (e) {
            pokemonStatsCache[id] = 0; // Default if API fails
          }
        })
      );

      // Rank trainers
      const trainers = await Promise.all(
        threadUsers.map(async uid => {
          const pokes = caughtPokemon[uid];
          const analyzed = await Promise.all(
            pokes.map(async poke => {
              const stats = pokemonStatsCache[poke.id] || 0;
              return { ...poke, stats };
            })
          );
          
          return {
            name: await usersData.getName(uid),
            uid,
            total: pokes.length,
            shiny: pokes.filter(p => p.shiny).length,
            power: analyzed.reduce((sum, p) => sum + p.stats, 0),
            strongest: analyzed.reduce((strongest, p) => 
              p.stats > strongest.stats ? p : strongest
            )
          };
        })
      );

      // Sort by total stats power
      trainers.sort((a, b) => b.power - a.power);
      const top8 = trainers.slice(0, 8);

      // Build leaderboard
      let leaderboard = `🏆 𝗧𝗢𝗣 𝟴 𝗠𝗔𝗦𝗧𝗘𝗥𝗦 🏆\n\n`;
      
      top8.forEach((trainer, i) => {
        leaderboard +=
          `${["🥇", "🥈", "🥉"][i] || `▫️`} ${trainer.name}\n` +
          `┣ Total Power: ${trainer.power}⚡\n` +
          `┣ Collection: ${trainer.total} | Shinies: ✨${trainer.shiny}\n` +
          `┗ Strongest: ${trainer.strongest.name} (${trainer.strongest.stats} BST)\n\n`;
      });

      // Send with champion's Pokémon image
      const champImage = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${
        top8[0]?.strongest.shiny ? 'shiny/' : ''
      }${top8[0]?.strongest.id}.png`;

      const msg = await message.reply({
        body: leaderboard,
        attachment: await global.utils.getStreamFromURL(champImage)
      });

      // Auto-unsend after 1 minute
      setTimeout(async () => {
        try { await message.unsend(msg.messageID); } catch (e) {}
      }, 60000);

    } catch (e) {
      console.error("PokeAPI error:", e);
      message.reply("Failed to fetch Pokémon stats. Using fallback ranking...");
      // Fallback to coin-based ranking here if desired
    }
  }
};