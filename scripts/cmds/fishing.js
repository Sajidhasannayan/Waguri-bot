const fs = require("fs").promises;
const path = require("path");
const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "fishing",
    version: "1.7",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Fish for Pokémon"
                      },
    longDescription: { en: "Fish in different locations, collect Pokémon, view details, and sell for profit! VIP members get better shiny rates and lower fishing costs."
                     },
    category: "pokebot",
    guide: {
      en: "{pn} <location|collection [Pokémon]|sell <Pokémon> <normal|shiny> <amount>>\n" +
          "Locations: ocean (VIP discounts), river (VIP discounts), pond (VIP discounts)\n" +
          "Examples: {pn} ocean, {pn} collection Magikarp, {pn} sell Magikarp normal 1, {pn} sell Magikarp shiny 1"
    },
    dependencies: []
  },

  onStart: async function ({ event, api, args, usersData, message }) {
    try {
      const format = this.formatNumber;
      const ADMIN_ID = "100031021522664";
      const isAdmin = event.senderID === ADMIN_ID;

      // Load VIP status from bank system
      const bankData = await this.loadBankData();
      const now = moment();
      const vipStatus = this.getVipStatus(event.senderID, bankData, now, isAdmin);
      const vipLevel = vipStatus.type;

      // 💎 VIP BENEFITS CONFIGURATION
      const VIP_BENEFITS = {
        diamond: {
          shinyRate: 1 / 6000,
          fishingCosts: { ocean: 20000, river: 15000, pond: 4000 }
        },
        gold: {
          shinyRate: 1 / 15000,
          fishingCosts: { ocean: 30000, river: 20000, pond: 5000 }
        },
        silver: {
          shinyRate: 1 / 25000,
          fishingCosts: { ocean: 40000, river: 25000, pond: 5000 }
        },
        none: {
          shinyRate: 1 / 30000,
          fishingCosts: { ocean: 50000, river: 25000, pond: 5000 }
        }
      };

      const benefits = VIP_BENEFITS[vipLevel] || VIP_BENEFITS.none;

      // 📚 COLLECTION STORAGE
      const collectionFile = path.join(__dirname, "fishing_collections.json");
      let collections = {};
      try {
        collections = JSON.parse(await fs.readFile(collectionFile, "utf8"));
      } catch {
        collections = {};
      }

      // Initialize user collection
      if (!collections[event.senderID]) collections[event.senderID] = {};

      // Centralized Pokémon data
      const pokemonData = {
        Magikarp: { emoji: "🐟", reward: 2000, shinyReward: 1000000, locations: { ocean: 35, river: 35, pond: 40 } },
        Tentacool: { emoji: "🪼", reward: 5000, shinyReward: 2500000, locations: { ocean: 15 } },
        Horsea: { emoji: "🐴", reward: 10000, shinyReward: 5000000, locations: { ocean: 10 } },
        Wailmer: { emoji: "🐳", reward: 20000, shinyReward: 10000000, locations: { ocean: 8 } },
        Sharpedo: { emoji: "🦈", reward: 40000, shinyReward: 20000000, locations: { ocean: 7 } },
        Kyogre: { emoji: "🌊", reward: 150000, shinyReward: 75000000, locations: { ocean: 1 } },
        Gyarados: { emoji: "🐉", reward: 80000, shinyReward: 40000000, locations: { ocean: 5 } },
        Lapras: { emoji: "🐢", reward: 60000, shinyReward: 30000000, locations: { ocean: 5 } },
        Vaporeon: { emoji: "🧜‍♀️", reward: 50000, shinyReward: 25000000, locations: { ocean: 4 } },
        Primarina: { emoji: "🧜‍♂️", reward: 70000, shinyReward: 35000000, locations: { ocean: 3 } },
        Wishiwashi: { emoji: "🐠", reward: 15000, shinyReward: 7500000, locations: { ocean: 4 } },
        Milotic: { emoji: "🐍", reward: 90000, shinyReward: 45000000, locations: { ocean: 3 } },
        Psyduck: { emoji: "🦆", reward: 3000, shinyReward: 1500000, locations: { river: 20 } },
        Poliwag: { emoji: "🐸", reward: 6000, shinyReward: 3000000, locations: { river: 15 } },
        Feebas: { emoji: "🐠", reward: 10000, shinyReward: 5000000, locations: { river: 3 } },
        Slowpoke: { emoji: "😴", reward: 4500, shinyReward: 2250000, locations: { river: 10 } },
        Starmie: { emoji: "⭐", reward: 8000, shinyReward: 4000000, locations: { river: 4 } },
        Quagsire: { emoji: "🐸", reward: 7000, shinyReward: 3500000, locations: { river: 5 } },
        Crawdaunt: { emoji: "🦞", reward: 9000, shinyReward: 4500000, locations: { river: 3 } },
        Kingdra: { emoji: "🐉", reward: 12000, shinyReward: 6000000, locations: { river: 3 } },
        Goldeen: { emoji: "🐡", reward: 2500, shinyReward: 1250000, locations: { river: 7, pond: 15 } },
        Barboach: { emoji: "🐬", reward: 4000, shinyReward: 2000000, locations: { pond: 10 } },
        Surskit: { emoji: "🦟", reward: 2000, shinyReward: 1000000, locations: { pond: 10 } },
        Mudkip: { emoji: "🐾", reward: 6000, shinyReward: 3000000, locations: { pond: 10 } },
        Tympole: { emoji: "🐸", reward: 2500, shinyReward: 1250000, locations: { pond: 8 } },
        Clodsire: { emoji: "🐡", reward: 5000, shinyReward: 2500000, locations: { pond: 4 } },
        Tadbulb: { emoji: "💡", reward: 3500, shinyReward: 1750000, locations: { pond: 3 } }
      };

      const pokemonMap = Object.fromEntries(Object.keys(pokemonData).map(name => [name.toLowerCase(), name]));

      // Handle subcommands
      const action = args[0]?.toLowerCase();
      if (action === "collection") {
        return await this.handleCollection(args, event, api, message, collections, collectionFile, format, pokemonData, pokemonMap);
      } else if (action === "sell") {
        return await this.handleSell(args, event, api, message, collections, collectionFile, usersData, format, pokemonData, pokemonMap);
      } else {
        return await this.handleFishing(action, event, api, message, collections, collectionFile, usersData, format, isAdmin, benefits, pokemonData, vipLevel);
      }
    } catch (error) {
      console.error("Fishing Game Error:", error);
      message.reply("❌ An error occurred while fishing. Try again later!");
    }
  },

  handleCollection: async function (args, event, api, message, collections, collectionFile, format, pokemonData, pokemonMap) {
    const pokemonInput = args[1]?.toLowerCase();

    if (!pokemonInput) {
      // Show all Pokémon
      const userCollection = collections[event.senderID];
      if (!Object.keys(userCollection).length) {
        return message.reply("🎒 Your collection is empty! Go fish with /fishing <location>");
      }
      let text = "🎒 Your Fishing Collection 🎒\n\n";
      for (const [pokemon, counts] of Object.entries(userCollection)) {
        text += `${pokemon}: ${counts.normal || 0}x Normal${counts.shiny ? `, ${counts.shiny}x Shiny ✨` : ""}\n`;
      }
      return message.reply(text);
    }

    // Show specific Pokémon details
    const pokemonName = pokemonMap[pokemonInput];
    if (!pokemonName || !pokemonData[pokemonName]) {
      return message.reply("❌ Invalid Pokémon! Check /fishing collection for your catches.");
    }
    const data = pokemonData[pokemonName];
    const userCollection = collections[event.senderID][pokemonName] || { normal: 0, shiny: 0 };
    let rarityText = "Rarity: ";
    for (const [loc, freq] of Object.entries(data.locations)) {
      rarityText += `${loc.charAt(0).toUpperCase() + loc.slice(1)} (${freq}%), `;
    }
    rarityText = rarityText.slice(0, -2);
    const replyText = `🎒 ${pokemonName} Details 🎒\n\n` +
                     `💰 Normal Price: ${format(data.reward)}$\n` +
                     `💰 Shiny Price: ${format(data.shinyReward)}$\n` +
                     `📊 ${rarityText}\n` +
                     `📦 Owned: ${userCollection.normal}x Normal${userCollection.shiny ? `, ${userCollection.shiny}x Shiny ✨` : ""}`;
    return message.reply(replyText);
  },

  handleSell: async function (args, event, api, message, collections, collectionFile, usersData, format, pokemonData, pokemonMap) {
    if (args.length < 4 || !args[1] || !["normal", "shiny"].includes(args[2].toLowerCase()) || isNaN(args[3])) {
      return message.reply("🔢 Usage: /fishing sell <Pokémon> <normal|shiny> <amount>\nExample: /fishing sell Magikarp normal 1");
    }
    const pokemonInput = args[1].toLowerCase();
    const type = args[2].toLowerCase();
    const amount = parseInt(args[3]);
    if (amount <= 0) {
      return message.reply("🔢 Amount must be positive!");
    }
    const pokemonName = pokemonMap[pokemonInput];
    if (!pokemonName || !pokemonData[pokemonName]) {
      return message.reply("❌ Invalid Pokémon! Check /fishing collection for your catches.");
    }
    const userCollection = collections[event.senderID][pokemonName];
    const count = userCollection ? userCollection[type] || 0 : 0;
    if (count < amount) {
      return message.reply(`❌ You only have ${count}x ${type} ${pokemonName}!`);
    }
    const data = pokemonData[pokemonName];
    const pricePerUnit = type === "normal" ? data.reward : data.shinyReward;
    const totalReward = amount * pricePerUnit;
    userCollection[type] -= amount;
    if (userCollection.normal === 0 && userCollection.shiny === 0) {
      delete collections[event.senderID][pokemonName];
    }
    const userData = await usersData.get(event.senderID);
    userData.money += totalReward;
    await usersData.set(event.senderID, userData);
    await fs.writeFile(collectionFile, JSON.stringify(collections), "utf8");
    return message.reply(
      `💰 Sold ${amount}x ${type === "shiny" ? "Shiny ✨ " : ""}${pokemonName}!\n` +
      `💵 Earned: ${format(totalReward)}$\n` +
      `🏦 Balance: ${format(userData.money)}$`
    );
  },

  handleFishing: async function (action, event, api, message, collections, collectionFile, usersData, format, isAdmin, benefits, pokemonData, vipLevel) {
    const locations = ["ocean", "river", "pond"];
    if (!locations.includes(action)) {
      return message.reply(
        `🌊 Invalid location! Use: /fishing <ocean|river|pond>\n` +
        `Costs (VIP discounts apply): Ocean, River, Pond`
      );
    }

    const fishingCost = benefits.fishingCosts[action];
    const userData = await usersData.get(event.senderID);
    let userBalance = userData.money || 0;

    if (!isAdmin && userBalance < fishingCost) {
      return message.reply(
        `❌ You need ${format(fishingCost)}$ to fish in the ${action}! ` +
        `Your balance: ${format(userBalance)}$`
      );
    }

    if (!isAdmin) {
      userData.money -= fishingCost;
      await usersData.set(event.senderID, userData);
    }

    // Generate fishing pool dynamically
    const pool = Object.entries(pokemonData)
      .filter(([name, data]) => data.locations[action])
      .map(([name, data]) => ({
        name,
        emoji: data.emoji,
        freq: data.locations[action],
        reward: data.reward,
        shinyReward: data.shinyReward
      }));

    const adminPoolNames = ["Kyogre", "Gyarados", "Lapras", "Vaporeon", "Primarina", "Wishiwashi", "Milotic",
                           "Feebas", "Starmie", "Quagsire", "Crawdaunt", "Kingdra", "Barboach", "Mudkip",
                           "Tympole", "Clodsire", "Tadbulb"];

    // Updated Fishing Animation
    const fishAnimation = async () => {
      const frames = [
        "🎣 Casting your line into the water... 🌊",
        "🎣 The bobber dips—something’s biting! 🐟",
        "🎣 Reeling it in with all your might... ⚡",
        "🎣 Almost there—get ready! 🎉"
      ];
      let msg;
      try {
        msg = await message.reply(frames[0]);
        for (let i = 1; i < frames.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second delay for smoother pacing
          await api.editMessage(frames[i], msg.messageID);
        }
      } catch (error) {
        console.error("Animation error:", error);
        if (!msg) msg = await message.reply("🎣 Oops! The animation broke, but your catch is safe!");
      }
      return msg;
    };
    const fishMsg = await fishAnimation();

    // Catch Pokémon
    let caughtPokemon, isShiny = false;
    if (isAdmin) {
      const adminPool = pool.filter(p => adminPoolNames.includes(p.name));
      caughtPokemon = adminPool[Math.floor(Math.random() * adminPool.length)];
      isShiny = Math.random() < 0.8;
    } else {
      const totalFreq = pool.reduce((sum, p) => sum + p.freq, 0);
      const rand = Math.random() * totalFreq;
      let cumulative = 0;
      for (const pokemon of pool) {
        cumulative += pokemon.freq;
        if (rand <= cumulative) {
          caughtPokemon = pokemon;
          break;
        }
      }
      isShiny = Math.random() < benefits.shinyRate;
    }

    const pokemonName = caughtPokemon.name;
    if (!collections[event.senderID][pokemonName]) {
      collections[event.senderID][pokemonName] = { normal: 0, shiny: 0 };
    }
    collections[event.senderID][pokemonName][isShiny ? "shiny" : "normal"] += 1;
    await fs.writeFile(collectionFile, JSON.stringify(collections), "utf8");

    // Result message
    let resultText = `🎣 Fishing in the ${action} 🎣\n\n` +
                    `${caughtPokemon.emoji} You caught a ${isShiny ? "Shiny ✨ " : ""}${pokemonName}!\n` +
                    `💰 Worth: ${format(isShiny ? caughtPokemon.shinyReward : caughtPokemon.reward)}$ (sell to earn)\n`;
    if (!isAdmin) {
      resultText += `📉 Cost: ${format(fishingCost)}$\n` +
                    `🏦 Balance: ${format(userData.money)}$\n`;
    } else {
      resultText += `👑 Admin Catch (no cost)\n` +
                    `🏦 Balance: ∞\n`;
    }
    resultText += `🎒 Added to collection: ${isShiny ? "Shiny ✨ " : ""}${pokemonName}`;
    if (vipLevel !== "none") {
      resultText += `\n💎 VIP ${vipLevel.toUpperCase()} benefits: Lower costs & better shiny odds!`;
    }
    await api.editMessage(resultText, fishMsg.messageID);

    // Bonus notification for rare or shiny catches
    if (isShiny || caughtPokemon.reward >= 40000) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await message.reply(
        `${isShiny ? "✨ SHINY LEGEND! ✨" : "🌟 EPIC CATCH! 🌟"}\n` +
        `You hooked a ${isShiny ? "Shiny ✨ " : ""}${pokemonName} worth ${format(isShiny ? caughtPokemon.shinyReward : caughtPokemon.reward)}$!`
      );
    } else if (caughtPokemon.reward >= 10000) {
      await message.reply(
        `🎉 Great catch! ${isShiny ? "Shiny ✨ " : ""}${pokemonName} is worth ${format(isShiny ? caughtPokemon.shinyReward : caughtPokemon.reward)}$!`
      );
    }
  },

  // Helper functions
  async loadBankData() {
    const dataFile = path.join(__dirname, "balance_data.json");
    try {
      return JSON.parse(await fs.readFile(dataFile, "utf8")) || { vip: {} };
    } catch {
      return { vip: {} };
    }
  },

  getVipStatus(userID, bankData, now, isAdmin) {
    if (isAdmin) return { type: "diamond", expires: null };
    const vip = bankData.vip?.[userID];
    if (!vip) return { type: "none", expires: null };
    if (moment(vip.expires).isBefore(now)) {
      delete bankData.vip[userID];
      return { type: "none", expires: null };
    }
    return { type: vip.type, expires: vip.expires };
  },

  formatNumber: function(num) {
    if (num === Infinity) return "∞";
    const absNum = Math.abs(num);
    if (absNum >= 1000000000) return `${(num/1000000000).toFixed(1)}B`;
    if (absNum >= 1000000) return `${(num/1000000).toFixed(1)}M`;
    if (absNum >= 1000) return `${(num/1000).toFixed(1)}K`;
    return num.toString();
  }
};