const axios = require('axios');
const { getStreamFromURL } = global.utils;

// Generation ranges for base Pokémon
const GENERATION_RANGES = [
  { start: 1, end: 151, name: "Generation 1 (Kanto - Red/Blue/Yellow)" },
  { start: 152, end: 251, name: "Generation 2 (Johto - Gold/Silver/Crystal)" },
  { start: 252, end: 386, name: "Generation 3 (Hoenn - Ruby/Sapphire/Emerald)" },
  { start: 387, end: 493, name: "Generation 4 (Sinnoh - Diamond/Pearl/Platinum)" },
  { start: 494, end: 649, name: "Generation 5 (Unova - Black/White)" },
  { start: 650, end: 721, name: "Generation 6 (Kalos - X/Y)" },
  { start: 722, end: 809, name: "Generation 7 (Alola - Sun/Moon)" },
  { start: 810, end: 905, name: "Generation 8 (Galar - Sword/Shield)" },
  { start: 906, end: 1025, name: "Generation 9 (Paldea - Scarlet/Violet)" },
  { start: 1026, end: 1032, name: "Generation 9 DLC (The Teal Mask/Indigo Disk)" }
];

// Special forms with their IDs
const SPECIAL_FORMS = {
  'venusaur-mega': 10033, 'charizard-mega-x': 10034, 'charizard-mega-y': 10035, 'blastoise-mega': 10036,
  'beedrill-mega': 10037, 'pidgeot-mega': 10038, 'alakazam-mega': 10039, 'slowbro-mega': 10040,
  'gengar-mega': 10041, 'kangaskhan-mega': 10042, 'pinsir-mega': 10043, 'gyarados-mega': 10044,
  'aerodactyl-mega': 10045, 'mewtwo-mega-x': 10046, 'mewtwo-mega-y': 10047, 'ampharos-mega': 10048,
  'scizor-mega': 10049, 'heracross-mega': 10050, 'houndoom-mega': 10051, 'tyranitar-mega': 10052,
  'blaziken-mega': 10053, 'gardevoir-mega': 10054, 'mawile-mega': 10055, 'aggron-mega': 10056,
  'medicham-mega': 10057, 'manectric-mega': 10058, 'banette-mega': 10059, 'absol-mega': 10060,
  'garchomp-mega': 10061, 'lucario-mega': 10062, 'abomasnow-mega': 10063, 'floette-eternal': 10064,
  'latias-mega': 10065, 'latios-mega': 10066, 'swampert-mega': 10067, 'sceptile-mega': 10068,
  'sableye-mega': 10069, 'altaria-mega': 10070, 'gallade-mega': 10071, 'audino-mega': 10072,
  'sharpedo-mega': 10073, 'slowpoke-galar': 10074, 'slowbro-galar': 10075, 'farfetchd-galar': 10076,
  'weezing-galar': 10077, 'mr-mime-galar': 10078, 'articuno-galar': 10079, 'zapdos-galar': 10080,
  'moltres-galar': 10081, 'slowking-galar': 10082, 'corsola-galar': 10083, 'zigzagoon-galar': 10084,
  'linoone-galar': 10085, 'darumaka-galar': 10086, 'darmanitan-galar': 10087, 'yamask-galar': 10088,
  'stunfisk-galar': 10089, 'zygarde-10': 10090, 'zygarde-complete': 10091, 'hoopa-unbound': 10092,
  'oricorio-pom-pom': 10093, 'oricorio-pau': 10094, 'oricorio-sensu': 10095, 'lycanroc-midnight': 10096,
  'lycanroc-dusk': 10097, 'wishiwashi-school': 10098, 'minior-orange': 10099, 'minior-yellow': 10100,
  'minior-green': 10101, 'minior-blue': 10102, 'minior-indigo': 10103, 'minior-violet': 10104,
  'mimikyu-busted': 10105, 'necrozma-dusk': 10106, 'necrozma-dawn': 10107, 'necrozma-ultra': 10108,
  'magearna-original': 10109, 'pikachu-starter': 10110, 'eevee-starter': 10111, 'kyogre-primal': 10112,
  'groudon-primal': 10113, 'venusaur-gmax': 10114, 'charizard-gmax': 10115, 'blastoise-gmax': 10116,
  'butterfree-gmax': 10117, 'pikachu-gmax': 10118, 'meowth-gmax': 10119, 'machamp-gmax': 10120,
  'gengar-gmax': 10121, 'kingler-gmax': 10122, 'lapras-gmax': 10123, 'eevee-gmax': 10124,
  'snorlax-gmax': 10125, 'garbodor-gmax': 10126, 'melmetal-gmax': 10127, 'rillaboom-gmax': 10128,
  'cinderace-gmax': 10129, 'inteleon-gmax': 10130, 'corviknight-gmax': 10131, 'orbeetle-gmax': 10132,
  'drednaw-gmax': 10133, 'coalossal-gmax': 10134, 'flapple-gmax': 10135, 'appletun-gmax': 10136,
  'sandaconda-gmax': 10137, 'toxtricity-gmax': 10138, 'centiskorch-gmax': 10139, 'hatterene-gmax': 10140,
  'grimmsnarl-gmax': 10141, 'alcremie-gmax': 10142, 'copperajah-gmax': 10143, 'duraludon-gmax': 10144,
  'urshifu-gmax': 10145, 'growlithe-hisui': 10146, 'arcanine-hisui': 10147, 'voltorb-hisui': 10148,
  'electrode-hisui': 10149, 'typhlosion-hisui': 10150, 'qwilfish-hisui': 10151, 'sneasel-hisui': 10152,
  'samurott-hisui': 10153, 'lilligant-hisui': 10154, 'zorua-hisui': 10155, 'zoroark-hisui': 10156,
  'braviary-hisui': 10157, 'sliggoo-hisui': 10158, 'goodra-hisui': 10159, 'avalugg-hisui': 10160,
  'decidueye-hisui': 10161, 'great-tusk': 10162, 'scream-tail': 10163, 'brute-bonnet': 10164,
  'flutter-mane': 10165, 'slither-wing': 10166, 'sandy-shocks': 10167, 'iron-treads': 10168,
  'iron-bundle': 10169, 'iron-hands': 10170, 'iron-jugulis': 10171, 'iron-moth': 10172,
  'iron-thorns': 10173, 'roaring-moon': 10174, 'iron-valiant': 10175, 'walking-wake': 10176,
  'iron-leaves': 10177, 'greninja-ash': 658, 'pikachu-cosplay': 25,
  'pikachu-cap-original': 25, 'pikachu-cap-hoenn': 25, 'pikachu-cap-sinnoh': 25,
  'pikachu-cap-unova': 25, 'pikachu-cap-kalos': 25, 'pikachu-cap-alola': 25,
  'pikachu-cap-partner': 25, 'pikachu-cap-world': 25
};

// Type emojis for visual enhancement
const TYPE_EMOJIS = {
  normal: "⚪", fighting: "🥊", flying: "🕊️", poison: "☠️", ground: "⛰️",
  rock: "🪨", bug: "🐞", ghost: "👻", steel: "⚙️", fire: "🔥",
  water: "🌊", grass: "🌿", electric: "⚡", psychic: "🧠", ice: "❄️",
  dragon: "🐉", dark: "🌑", fairy: "🧚"
};

module.exports = {
  config: {
    name: "pokedex",
    aliases: ["pokemon", "dex"],
    version: "3.0",
    author: "SajidMogged",
    countDown: 15,
    role: 0,
    description: { en: "Advanced Pokémon database" },
    category: "pokebot",
    guide: {
      en: "{pn} [pokémon name] (shiny)\n{pn} -a [ability name]\nFor forms: {pn} [name]-[form]\nExample: {pn} charizard-mega-x, {pn} greninja-ash, {pn} pikachu-cosplay"
    }
  },

  onStart: async function ({ message, args }) {
    try {
      if (args[0] === "-a" || args[0] === "-ability") {
        return await this.handleAbilitySearch(message, args.slice(1).join(" "));
      }

      let pokemonName = args.join("-").toLowerCase();
      let shiny = false;

      if (pokemonName.includes("shiny")) {
        shiny = true;
        pokemonName = pokemonName.replace("shiny", "").replace(/-+/g, '-').replace(/^-|-$/g, '');
      }

      if (!pokemonName) return message.reply("⚠️ Please enter a Pokémon name");

      message.reply("🔍 Searching Pokédex...");

      let pokemonData;
      let speciesData;
      let formDescription = null;

      try {
        let apiName = pokemonName;
        if (pokemonName.startsWith('pikachu-cosplay') || pokemonName.startsWith('pikachu-cap-') || pokemonName === 'greninja-ash') {
          apiName = pokemonName;
        }

        const pokemonResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon/${apiName}`);
        pokemonData = pokemonResponse.data;
        const speciesResponse = await axios.get(pokemonData.species.url);
        speciesData = speciesResponse.data;

        if (SPECIAL_FORMS[pokemonName]) {
          try {
            const formSpeciesResponse = await axios.get(`https://pokeapi.co/api/v2/pokemon-species/${pokemonData.id}/`);
            const formDescEntry = formSpeciesResponse.data.flavor_text_entries.find(
              entry => entry.language.name === "en"
            );
            if (formDescEntry) {
              formDescription = formDescEntry.flavor_text.replace(/\n/g, " ").replace(/\f/g, " ");
            }
          } catch (e) {
            console.log("Couldn't fetch form-specific description:", e.message);
          }
        }
      } catch (e) {
        try {
          const spacedName = pokemonName.replace(/-/g, ' ');
          const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${spacedName}`);
          pokemonData = response.data;
          speciesData = (await axios.get(pokemonData.species.url)).data;
        } catch (e2) {
          throw e;
        }
      }

      const generation = this.getGenerationById(pokemonData.id, pokemonName);

      let evolutions = [];
      let preEvo = null;
      let specialForms = [];
      if (speciesData.evolution_chain) {
        const { data: evolutionData } = await axios.get(speciesData.evolution_chain.url);
        evolutions = this.getEvolutions(evolutionData.chain, pokemonData.name);
        preEvo = this.getPreEvolution(evolutionData.chain, pokemonData.name);
        specialForms = this.getSpecialForms(pokemonData.name, pokemonData.id);
      }

      const stats = pokemonData.stats.map(stat => {
        return `${stat.stat.name.toUpperCase()}: ${stat.base_stat}`;
      }).join("\n");

      const abilities = pokemonData.abilities.map(ability => {
        return `• ${ability.ability.name.replace(/-/g, " ")}${ability.is_hidden ? " (Hidden)" : ""}`;
      }).join("\n");

      const types = pokemonData.types.map(type => 
        `${TYPE_EMOJIS[type.type.name] || "❓"} ${this.capitalizeFirstLetter(type.type.name)}`
      ).join(" | ");

      const effectiveness = await this.getTypeEffectiveness(pokemonData.types);
      const weaknesses = effectiveness.filter(x => x.multiplier > 1).sort((a, b) => b.multiplier - a.multiplier);
      const resistances = effectiveness.filter(x => x.multiplier < 1).sort((a, b) => a.multiplier - b.multiplier);
      const immunities = effectiveness.filter(x => x.multiplier === 0);

      const formatEffectiveness = (arr) => {
        return arr.map(x => `${TYPE_EMOJIS[x.type] || "❓"} ${this.capitalizeFirstLetter(x.type)} ${x.multiplier}x`).join(", ");
      };

      const genderRatio = this.getGenderRatio(speciesData.gender_rate);
      const eggGroups = speciesData.egg_groups.length > 0 
        ? speciesData.egg_groups.map(group => this.capitalizeFirstLetter(group.name)).join(", ")
        : "Undiscovered";
      const catchRate = speciesData.capture_rate || "N/A";
      const baseExp = pokemonData.base_experience || "N/A";
      const growthRate = speciesData.growth_rate ? this.capitalizeFirstLetter(speciesData.growth_rate.name.replace(/-/g, " ")) : "N/A";
      const baseHappiness = speciesData.base_happiness || "N/A";

      let description = "No description available";
      if (formDescription) {
        description = formDescription;
      } else {
        const descriptionEntry = speciesData.flavor_text_entries.find(entry => 
          entry.language.name === "en"
        );
        if (descriptionEntry) {
          description = descriptionEntry.flavor_text.replace(/\n/g, " ").replace(/\f/g, " ");
        }
      }

      let infoMsg = `✨ ${shiny ? "SHINY " : ""}${this.capitalizeFirstLetter(pokemonData.name)} #${pokemonData.id}\n`;
      infoMsg += `📜 ${generation}\n\n`;
      infoMsg += `📏 Height: ${pokemonData.height / 10}m | ⚖️ Weight: ${pokemonData.weight / 10}kg\n`;
      infoMsg += `👫 Gender: ${genderRatio}\n`;
      infoMsg += `🥚 Egg Groups: ${eggGroups}\n`;
      infoMsg += `🌱 Growth Rate: ${growthRate}\n`;
      infoMsg += `❤️ Base Happiness: ${baseHappiness}\n`;
      infoMsg += `🎯 Catch Rate: ${catchRate}\n`;
      infoMsg += `🏆 Base Exp: ${baseExp}\n`;
      infoMsg += `🔮 Types: ${types}\n\n`;
      infoMsg += `📊 Stats:\n${stats}\n\n`;
      infoMsg += `✨ Abilities:\n${abilities}\n\n`;

      if (weaknesses.length > 0) {
        infoMsg += `⚠️ Weak Against:\n${formatEffectiveness(weaknesses)}\n\n`;
      }
      if (resistances.length > 0) {
        infoMsg += `🛡️ Resistant Against:\n${formatEffectiveness(resistances)}\n\n`;
      }
      if (immunities.length > 0) {
        infoMsg += `🚫 Immune Against:\n${formatEffectiveness(immunities)}\n\n`;
      }

      infoMsg += `📖 Description:\n${description}\n\n`;

      if (preEvo) infoMsg += `⬆️ Pre-evolution: ${this.capitalizeFirstLetter(preEvo)}\n`;
      if (evolutions.length > 0 || specialForms.length > 0) {
        let evoLine = [];
        if (evolutions.length > 0) {
          evoLine.push(`Standard: ${evolutions.map(e => this.capitalizeFirstLetter(e)).join(", ")}`);
        }
        if (specialForms.length > 0) {
          evoLine.push(`Special Forms: ${specialForms.map(f => this.capitalizeFirstLetter(f)).join(", ")}`);
        }
        infoMsg += `⬇️ Evolutions:\n${evoLine.join("\n")}\n`;
      }

      let imageUrl;
      if (shiny) {
        imageUrl = pokemonData.sprites.other?.['official-artwork']?.front_shiny || 
                  pokemonData.sprites.other?.home?.front_shiny ||
                  pokemonData.sprites.front_shiny;
      } else {
        imageUrl = pokemonData.sprites.other?.['official-artwork']?.front_default || 
                  pokemonData.sprites.other?.home?.front_default ||
                  pokemonData.sprites.front_default;
      }

      await message.reply({
        body: infoMsg,
        attachment: await getStreamFromURL(imageUrl)
      });

    } catch (error) {
      if (error.response?.status === 404) {
        message.reply(`❌ Pokémon not found. For special forms, try:\n/pokedex [name]-[form]\nExample: /pokedex greninja-ash\n/pokedex pikachu-cosplay`);
      } else {
        console.error("Pokedex Error:", error);
        message.reply("❌ Error fetching Pokémon data. Try again later.");
      }
    }
  },

  handleAbilitySearch: async function(message, abilityName) {
    if (!abilityName) return message.reply("⚠️ Please enter an ability name");
    
    try {
      message.reply("🔍 Searching for ability info...");
      
      const { data: abilityData } = await axios.get(`https://pokeapi.co/api/v2/ability/${abilityName.toLowerCase().replace(/ /g, "-")}`);
      
      const effectEntry = abilityData.effect_entries.find(entry => entry.language.name === "en") || 
                         abilityData.flavor_text_entries.find(entry => entry.language.name === "en");
      
      const generation = this.getGenerationForAbility(abilityData.id);
      
      let abilityInfo = `✨ ${this.capitalizeFirstLetter(abilityData.name)}\n`;
      abilityInfo += `📜 ${generation}\n\n`;
      abilityInfo += `📖 Effect:\n${effectEntry ? effectEntry.effect || effectEntry.flavor_text : "No description available"}\n\n`;
      
      if (abilityData.pokemon.length > 0) {
        abilityInfo += `🐾 Pokémon with this ability:\n`;
        abilityInfo += abilityData.pokemon.slice(0, 15).map(p => `• ${this.capitalizeFirstLetter(p.pokemon.name)}`).join("\n");
        if (abilityData.pokemon.length > 15) {
          abilityInfo += `\n...and ${abilityData.pokemon.length - 15} more`;
        }
      }
      
      await message.reply(abilityInfo);
    } catch (error) {
      if (error.response?.status === 404) {
        message.reply("❌ Ability not found. Check your spelling!");
      } else {
        console.error("Ability Search Error:", error);
        message.reply("❌ Error fetching ability data. Try again later.");
      }
    }
  },

  getGenerationById: function(pokemonId, pokemonName) {
    if (SPECIAL_FORMS[pokemonName]) {
      const formId = SPECIAL_FORMS[pokemonName];
      if (pokemonName === 'greninja-ash') {
        return "Generation 7 (Alola - Sun/Moon)";
      }
      if (pokemonName.startsWith('pikachu-cosplay')) {
        return "Generation 6 (Kalos - Omega Ruby/Alpha Sapphire)";
      }
      if (pokemonName.startsWith('pikachu-cap-')) {
        if (pokemonName === 'pikachu-cap-world') {
          return "Generation 8 (Galar - Sword/Shield)";
        }
        return "Generation 7 (Alola - Sun/Moon)";
      }
      if (formId >= 10033 && formId <= 10072) return "Generation 6 (Kalos - X/Y)";
      if (formId >= 10074 && formId <= 10089) return "Generation 8 (Galar - Sword/Shield)";
      if (formId >= 10090 && formId <= 10109) return "Generation 7 (Alola - Sun/Moon)";
      if (formId >= 10112 && formId <= 10113) return "Generation 6 (Kalos - X/Y)";
      if (formId >= 10114 && formId <= 10145) return "Generation 8 (Galar - Sword/Shield)";
      if (formId >= 10146 && formId <= 10161) return "Generation 8 (Galar - Sword/Shield)";
      if (formId >= 10162 && formId <= 10177) return "Generation 9 (Paldea - Scarlet/Violet)";
    }

    for (const range of GENERATION_RANGES) {
      if (pokemonId >= range.start && pokemonId <= range.end) {
        return range.name;
      }
    }
    return "Generation data not available";
  },

  getGenerationForAbility: function(abilityId) {
    if (abilityId <= 165) return "Introduced in Generation 3";
    if (abilityId <= 267) return "Introduced in Generation 4";
    if (abilityId <= 298) return "Introduced in Generation 5";
    if (abilityId <= 305) return "Introduced in Generation 6";
    if (abilityId <= 336) return "Introduced in Generation 7";
    if (abilityId <= 366) return "Introduced in Generation 8";
    if (abilityId <= 400) return "Introduced in Generation 9";
    return "Introduced in a later generation";
  },

  getGenderRatio: function(genderRate) {
    if (genderRate === -1) return "Genderless";
    const femalePercentage = (genderRate / 8) * 100;
    const malePercentage = 100 - femalePercentage;
    return `${malePercentage}% ♂ | ${femalePercentage}% ♀`;
  },

  getEvolutions: function(chain, currentName, evolutions = []) {
    if (chain.species.name === currentName) {
      chain.evolves_to.forEach(evolution => {
        evolutions.push(evolution.species.name);
        this.getEvolutions(evolution, currentName, evolutions);
      });
    } else {
      chain.evolves_to.forEach(evolution => {
        evolutions.push(evolution.species.name);
        this.getEvolutions(evolution, currentName, evolutions);
      });
    }
    return [...new Set(evolutions)];
  },

  getPreEvolution: function(chain, currentName, preEvo = null) {
    if (chain.species.name === currentName) return preEvo;
    if (chain.evolves_to.length > 0) {
      for (const evolution of chain.evolves_to) {
        if (evolution.species.name === currentName) return chain.species.name;
        const result = this.getPreEvolution(evolution, currentName, chain.species.name);
        if (result) return result;
      }
    }
    return null;
  },

  getSpecialForms: function(pokemonName, pokemonId) {
    const specialForms = [];
    const baseName = pokemonName.split('-')[0];

    for (const [formName, formId] of Object.entries(SPECIAL_FORMS)) {
      if (formName.startsWith(baseName + '-') && formName !== pokemonName) {
        specialForms.push(formName);
      }
    }

    return specialForms;
  },

  getTypeEffectiveness: async function(types) {
    const effectivenessMap = {};
    const allTypes = [
      'normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 
      'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 
      'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy'
    ];

    allTypes.forEach(type => {
      effectivenessMap[type] = 1;
    });

    for (const type of types) {
      const { data: typeData } = await axios.get(type.type.url);
      typeData.damage_relations.double_damage_from.forEach(weakness => {
        effectivenessMap[weakness.name] *= 2;
      });
      typeData.damage_relations.half_damage_from.forEach(resistance => {
        effectivenessMap[resistance.name] *= 0.5;
      });
      typeData.damage_relations.no_damage_from.forEach(immunity => {
        effectivenessMap[immunity.name] *= 0;
      });
    }

    return Object.entries(effectivenessMap)
      .map(([type, multiplier]) => ({ type, multiplier }))
      .filter(({ multiplier }) => multiplier !== 1);
  },

  capitalizeFirstLetter: function(string) {
    return string.split(/[- ]/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
};