const axios = require('axios');
const { getStreamFromURL } = global.utils;

// Generation mappings
const GENERATION_RANGES = [
  { id: 1, name: "Generation I (Red/Blue/Yellow)" },
  { id: 2, name: "Generation II (Gold/Silver/Crystal)" },
  { id: 3, name: "Generation III (Ruby/Sapphire/Emerald)" },
  { id: 4, name: "Generation IV (Diamond/Pearl/Platinum)" },
  { id: 5, name: "Generation V (Black/White)" },
  { id: 6, name: "Generation VI (X/Y)" },
  { id: 7, name: "Generation VII (Sun/Moon)" },
  { id: 8, name: "Generation VIII (Sword/Shield)" },
  { id: 9, name: "Generation IX (Scarlet/Violet)" }
];

// Type emojis
const TYPE_EMOJIS = {
  normal: "⚪", fighting: "🥊", flying: "🕊️", poison: "☠️", ground: "⛰️",
  rock: "🪨", bug: "🐞", ghost: "👻", steel: "⚙️", fire: "🔥",
  water: "🌊", grass: "🌿", electric: "⚡", psychic: "🧠", ice: "❄️",
  dragon: "🐉", dark: "🌑", fairy: "🧚"
};

module.exports = {
  config: {
    name: "pokepedia",
    aliases: ["pwiki", "pedia"],
    version: "1.4",
    author: "SajidMogged",
    countDown: 15,
    role: 0,
    description: { en: "Pokémon nature, generation, move names and movesets information"
                 },
    category: "pokebot",
    guide: {
      en: "{pn} -i [item name] | -n [nature name] | -m [move name] | -ms [pokemon] [-g [generation]]"
    }
  },

  onStart: async function ({ message, args }) {
    if (!args[0]) return message.reply("⚠️ Please use -i [item], -n [nature], -m [move], or -ms [pokemon]");

    const flag = args[0].toLowerCase();
    const query = args.slice(1).join("-").toLowerCase();

    if (!query && flag !== "-ms") return message.reply("⚠️ Please provide a name after the flag");

    try {
      message.reply("🔍 Searching Poképédia...");

      if (flag === "-i") {
        await this.handleItem(message, query);
      } else if (flag === "-n") {
        await this.handleNature(message, query);
      } else if (flag === "-m") {
        await this.handleMove(message, query);
      } else if (flag === "-ms") {
        const genIndex = args.indexOf("-g");
        let generation = null;
        if (genIndex !== -1 && genIndex + 1 < args.length) {
          generation = parseInt(args[genIndex + 1]);
          if (isNaN(generation) || generation < 1 || generation > 9) {
            return message.reply("❌ Invalid generation. Use a number between 1 and 9.");
          }
        }
        await this.handleMoveset(message, query, generation);
      } else {
        return message.reply("❌ Invalid flag. Use -i for items, -n for natures, -m for moves, or -ms for movesets.");
      }
    } catch (error) {
      console.error(`Poképédia Error [${flag}]:`, error.message);
      if (error.response?.status === 404) {
        message.reply(`❌ ${flag === "-ms" ? "Pokémon" : flag === "-i" ? "Item" : flag === "-n" ? "Nature" : "Move"} not found. Use hyphens (e.g., 'pikachu' or 'choice-scarf').`);
      } else {
        message.reply("❌ Error fetching data. Check your input or try again later.");
      }
    }
  },

  handleItem: async function (message, itemName) {
    let itemData;
    try {
      const response = await axios.get(`https://pokeapi.co/api/v2/item/${itemName}`, { timeout: 5000 });
      itemData = response.data;
    } catch (e) {
      console.error("PokéAPI Item Fetch Error:", e.message);
      throw new Error("Failed to fetch item from PokéAPI");
    }

    const description = itemData.effect_entries.find(entry => entry.language.name === "en")?.effect
      || itemData.flavor_text_entries.find(entry => entry.language.name === "en")?.text
      || "No description available";
    const generationId = itemData.generation?.id || 1;
    const generation = GENERATION_RANGES.find(gen => gen.id === generationId)?.name || "Unknown Generation";
    
    // Use Bulbapedia high-res sprite
    const formattedName = this.capitalizeFirstLetter(itemData.name.replace(/-/g, " "));
    const imageUrl = `https://archives.bulbagarden.net/media/upload/thumb/${formattedName.charAt(0).toLowerCase()}/${itemData.name}.png/96px-${itemData.name}.png`;
    const fallbackImageUrl = itemData.sprites?.default || "https://via.placeholder.com/50";

    let infoMsg = `🛠️ ${this.capitalizeFirstLetter(itemData.name)}\n`;
    infoMsg += `📜 Introduced: ${generation}\n\n`;
    infoMsg += `📖 Description:\n${description.replace(/\n/g, " ").replace(/\f/g, " ")}`;

    try {
      await message.reply({
        body: infoMsg,
        attachment: await getStreamFromURL(imageUrl)
      });
    } catch (e) {
      console.error("High-Res Image Error, falling back to PokéAPI sprite:", e.message);
      try {
        await message.reply({
          body: infoMsg,
          attachment: await getStreamFromURL(fallbackImageUrl)
        });
      } catch (e2) {
        console.error("Fallback Image Error:", e2.message);
        await message.reply(infoMsg); // Send text only if both images fail
      }
    }
  },

  handleNature: async function (message, natureName) {
    const { data: natureData } = await axios.get(`https://pokeapi.co/api/v2/nature/${natureName}`);
    
    const increasedStat = natureData.increased_stat ? this.capitalizeFirstLetter(natureData.increased_stat.name) : "None";
    const decreasedStat = natureData.decreased_stat ? this.capitalizeFirstLetter(natureData.decreased_stat.name) : "None";
    const likesFlavor = natureData.likes_flavor ? this.capitalizeFirstLetter(natureData.likes_flavor.name) : "None";
    const hatesFlavor = natureData.hates_flavor ? this.capitalizeFirstLetter(natureData.hates_flavor.name) : "None";

    let infoMsg = `🌱 ${this.capitalizeFirstLetter(natureData.name)}\n`;
    infoMsg += `📜 Introduced: Generation III (Ruby/Sapphire/Emerald)\n\n`;
    infoMsg += `📈 Increases: ${increasedStat} (+10%)\n`;
    infoMsg += `📉 Decreases: ${decreasedStat} (-10%)\n\n`;
    infoMsg += `🍒 Likes Flavor: ${likesFlavor}\n`;
    infoMsg += `🚫 Hates Flavor: ${hatesFlavor}`;

    await message.reply(infoMsg);
  },

  handleMove: async function (message, moveName) {
    const { data: moveData } = await axios.get(`https://pokeapi.co/api/v2/move/${moveName}`);
    
    const type = moveData.type.name;
    const power = moveData.power || "—";
    const accuracy = moveData.accuracy || "—";
    const pp = moveData.pp || "—";
    const priority = moveData.priority || 0;
    const category = moveData.damage_class.name === "physical" ? "Physical" : moveData.damage_class.name === "special" ? "Special" : "Status";
    const generationId = moveData.generation.id;
    const generation = GENERATION_RANGES.find(gen => gen.id === generationId)?.name || "Unknown Generation";
    const description = moveData.effect_entries.find(entry => entry.language.name === "en")?.effect
      || moveData.flavor_text_entries.find(entry => entry.language.name === "en")?.flavor_text
      || "No description available";
    const effectChance = moveData.effect_chance ? `${moveData.effect_chance}%` : "—";
    const target = moveData.target.name
      .replace(/-/g, " ")
      .replace(/\b\w/g, char => char.toUpperCase()) || "Unknown";
    const meta = moveData.meta || {};
    const flags = [];
    if (meta?.makes_contact) flags.push("Contact");
    if (meta?.protect) flags.push("Protectable");
    if (meta?.sound) flags.push("Sound-based");

    let priorityText = priority === 0 ? "Normal" : priority > 0 ? `+${priority} (Moves first)` : `${priority} (Moves later)`;
    let infoMsg = `⚡ ${this.capitalizeFirstLetter(moveData.name)}\n`;
    infoMsg += `📜 Introduced: ${generation}\n\n`;
    infoMsg += `🔮 Type: ${TYPE_EMOJIS[type] || "❓"} ${this.capitalizeFirstLetter(type)}\n`;
    infoMsg += `🏷️ Category: ${category}\n`;
    infoMsg += `💪 Power: ${power}\n`;
    infoMsg += `🎯 Accuracy: ${accuracy}\n`;
    infoMsg += `🔋 PP: ${pp}\n`;
    infoMsg += `⏩ Priority: ${priorityText}\n`;
    infoMsg += `🎲 Effect Chance: ${effectChance}\n`;
    infoMsg += `🎯 Target: ${target}\n`;
    if (flags.length > 0) {
      infoMsg += `🚩 Flags: ${flags.join(", ")}\n`;
    }
    infoMsg += `\n📖 Description:\n${description
      .replace(/\n/g, " ")
      .replace(/\f/g, " ")
      .replace(/\$effect_chance%/, effectChance !== "—" ? effectChance : "")}`;

    await message.reply(infoMsg);
  },

  handleMoveset: async function (message, pokemonName, generation = null) {
    const { data: pokemonData } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
    
    const moves = pokemonData.moves;
    const versionGroups = this.getVersionGroups(generation);
    const latestVersionGroup = versionGroups[versionGroups.length - 1];

    let infoMsg = `📘 **${this.capitalizeFirstLetter(pokemonName)} Moveset**`;
    if (generation) {
      infoMsg += ` (Generation ${generation})`;
    } else {
      infoMsg += ` (Latest Generation)`;
    }
    infoMsg += `\n\n`;

    // Categorize moves by learn method
    const levelUpMoves = this.getMovesByMethod(moves, "level-up", versionGroups);
    const eggMoves = this.getMovesByMethod(moves, "egg", versionGroups);
    const tutorMoves = this.getMovesByMethod(moves, "tutor", versionGroups);
    const machineMoves = this.getMovesByMethod(moves, "machine", versionGroups);
    const legacyMoves = this.getLegacyMoves(moves, latestVersionGroup);

    // Level-up moves
    if (levelUpMoves.length > 0) {
      infoMsg += `**Level-up moves:**\n`;
      levelUpMoves.forEach(move => {
        const level = move.version_group_details.find(detail => detail.version_group.name === latestVersionGroup)?.level_learned_at || "N/A";
        infoMsg += `- ${this.capitalizeFirstLetter(move.move.name)} (Level ${level})\n`;
      });
      infoMsg += `\n`;
    }

    // Egg moves
    if (eggMoves.length > 0) {
      infoMsg += `**Egg moves:**\n`;
      eggMoves.forEach(move => {
        infoMsg += `- ${this.capitalizeFirstLetter(move.move.name)}\n`;
      });
      infoMsg += `\n`;
    }

    // Tutor moves
    if (tutorMoves.length > 0) {
      infoMsg += `**Tutor moves:**\n`;
      tutorMoves.forEach(move => {
        infoMsg += `- ${this.capitalizeFirstLetter(move.move.name)}\n`;
      });
      infoMsg += `\n`;
    }

    // TM/HM moves
    if (machineMoves.length > 0) {
      infoMsg += `**TM/HM moves:**\n`;
      machineMoves.forEach(move => {
        infoMsg += `- ${this.capitalizeFirstLetter(move.move.name)}\n`;
      });
      infoMsg += `\n`;
    }

    // Legacy moves
    if (legacyMoves.length > 0) {
      infoMsg += `**Legacy moves (not in latest generation):**\n`;
      legacyMoves.forEach(move => {
        const earliestVersion = move.version_group_details[0].version_group.name;
        infoMsg += `- ${this.capitalizeFirstLetter(move.move.name)} (Available in ${earliestVersion})\n`;
      });
    }

    await message.reply(infoMsg);
  },

  getVersionGroups: function (generation = null) {
    const versionGroupsByGen = {
      1: ["red-blue", "yellow"],
      2: ["gold-silver", "crystal"],
      3: ["ruby-sapphire", "emerald", "firered-leafgreen"],
      4: ["diamond-pearl", "platinum", "heartgold-soulsilver"],
      5: ["black-white", "black-2-white-2"],
      6: ["x-y", "omega-ruby-alpha-sapphire"],
      7: ["sun-moon", "ultra-sun-ultra-moon"],
      8: ["sword-shield"],
      9: ["scarlet-violet"]
    };
    if (generation) {
      return versionGroupsByGen[generation] || [];
    }
    return versionGroupsByGen[9]; // Default to latest generation
  },

  getMovesByMethod: function (moves, method, versionGroups) {
    return moves.filter(move => 
      move.version_group_details.some(detail => 
        detail.move_learn_method.name === method && versionGroups.includes(detail.version_group.name)
      )
    );
  },

  getLegacyMoves: function (moves, latestVersionGroup) {
    return moves.filter(move => 
      !move.version_group_details.some(detail => detail.version_group.name === latestVersionGroup) &&
      move.version_group_details.length > 0
    );
  },

  capitalizeFirstLetter: function (string) {
    return string.split(/[- ]/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  }
};