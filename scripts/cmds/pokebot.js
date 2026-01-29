const fs = require("fs");
const path = require("path");

function getPokemonImageUrl(id, shiny) {
  return shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function getRandomReward(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getPokemonRewards(id, isShiny) {
  const generations = [
    { min: 1, max: 151, coinsMin: 50, coinsMax: 100, expMin: 40, expMax: 70 },
    { min: 152, max: 251, coinsMin: 60, coinsMax: 110, expMin: 50, expMax: 80 },
    { min: 252, max: 386, coinsMin: 70, coinsMax: 120, expMin: 60, expMax: 90 },
    { min: 387, max: 493, coinsMin: 80, coinsMax: 130, expMin: 70, expMax: 100 },
    { min: 494, max: 649, coinsMin: 90, coinsMax: 140, expMin: 80, expMax: 110 },
    { min: 650, max: 721, coinsMin: 100, coinsMax: 150, expMin: 90, expMax: 120 },
    { min: 722, max: 809, coinsMin: 110, coinsMax: 160, expMin: 100, expMax: 130 },
    { min: 810, max: 898, coinsMin: 120, coinsMax: 170, expMin: 110, expMax: 140 },
    { min: 899, max: 10100, coinsMin: 130, coinsMax: 180, expMin: 120, expMax: 150 }
  ];
  const gen = generations.find(g => id >= g.min && id <= g.max) || generations.at(-1);
  const multiplier = isShiny ? 1.5 : 1;
  return {
    coins: Math.floor(getRandomReward(gen.coinsMin, gen.coinsMax) * multiplier),
    exp: Math.floor(getRandomReward(gen.expMin, gen.expMax) * multiplier)
  };
}

function saveCaughtPokemon(userID, pokemonData) {
  const filePath = './caughtPokemon.json';
  let caughtPokemon = {};
  try {
    if (fs.existsSync(filePath)) caughtPokemon = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!caughtPokemon[userID]) caughtPokemon[userID] = [];
    caughtPokemon[userID].push(pokemonData);
    fs.writeFileSync(filePath, JSON.stringify(caughtPokemon, null, 2));
    return true;
  } catch (err) {
    console.error("Save error:", err);
    return false;
  }
}

const lastCollectionState = {};
const pokeTimers = {};

module.exports = {
  config: {
    name: "pokebot",
    aliases: ["pc"],
    version: "2.0",
    author: "SajidMogged",
    countDown: 1,
    role: 0,
    shortDescription: {
      en: "Pokémon catching game"
    },
    Description: {
      en: "Enable or disable pokegame"
    },
    category: "pokebot",
    guide: {
      en: "{pn} [on|off|collection [page]|view <pokemon> [shiny]]"
    }
  },

  onStart: async function ({ message, event, threadsData, args, usersData }) {
    const filePath = './caughtPokemon.json';
    const userID = event.senderID;

    if (args[0] === "collection") {
      const page = parseInt(args[1]) || 1;
      if (!fs.existsSync(filePath)) return message.reply("You haven't caught any Pokémon yet!");
      const caughtPokemon = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const userPokemon = caughtPokemon[userID] || [];
      if (!userPokemon.length) return message.reply("You haven't caught any Pokémon yet!");

      const pokemonCounts = {};
      userPokemon.forEach(poke => {
        if (!pokemonCounts[poke.name]) pokemonCounts[poke.name] = { normal: 0, shiny: 0 };
        poke.shiny ? pokemonCounts[poke.name].shiny++ : pokemonCounts[poke.name].normal++;
      });

      const sortedNames = Object.keys(pokemonCounts).sort();
      const totalPages = Math.ceil(sortedNames.length / 10);
      const currentPage = Math.min(page, totalPages);
      const slice = sortedNames.slice((currentPage - 1) * 10, currentPage * 10);

      let response = `🌍 Your Pokémon Collection (Page ${currentPage}/${totalPages}):\n\n`;
      response += `🔹 Total Caught: ${userPokemon.length}\n`;
      response += `🔹 Unique Species: ${sortedNames.length}\n`;
      response += `✨ Total Shinies: ${Object.values(pokemonCounts).reduce((a, b) => a + b.shiny, 0)}\n\n`;

      slice.forEach(name => {
        const { normal, shiny } = pokemonCounts[name];
        response += `• ${name} - Normal: ${normal}, Shiny: ${shiny}\n`;
      });

      response += `\nReply with:\n- "next" or "prev" to navigate\n- "<pokemon>" to view details\n- "<pokemon> shiny" for shiny versions`;

      const reply = await message.reply(response);
      setTimeout(() => message.unsend(reply.messageID), 60000);

      const key = event.threadID + userID;
      lastCollectionState[key] = {
        currentPage,
        messageID: reply.messageID,
        pokemonCounts,
        userPokemon,
        sortedNames,
        totalPages
      };

      global.GoatBot.onReply.set(reply.messageID, {
        commandName: "pokebot",
        type: "collectionPage",
        key,
        userID
      });
      return;
    }

    if (args[0] === "view") {
      const name = args[1]?.toLowerCase();
      const shiny = args[2]?.toLowerCase() === "shiny";
      if (!name) return message.reply("Use: /pokebot view <pokemon> [shiny]");

      if (!fs.existsSync(filePath)) return message.reply("You haven't caught any Pokémon yet!");
      const caughtPokemon = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const owned = (caughtPokemon[userID] || []).filter(p => p.name.toLowerCase() === name && (!shiny || p.shiny));
      if (!owned.length) return message.reply(`You haven't caught any ${shiny ? "shiny " : ""}${name} yet!`);

      const info = owned.sort((a, b) => new Date(b.caughtAt) - new Date(a.caughtAt))[0];
      const imageUrl = getPokemonImageUrl(info.id, info.shiny);
      const date = new Date(info.caughtAt).toLocaleString();

      const response = `ℹ️ Pokémon Info:\n\nName: ${info.name}\nType: ${info.shiny ? "✨ Shiny ✨" : "Normal"}\nCaught on: ${date}\nID: ${info.id}\nOT: ${info.originalTrainer || "Unknown"}`;

      const msg = await message.reply({ body: response, attachment: await global.utils.getStreamFromURL(imageUrl) });
      setTimeout(() => message.unsend(msg.messageID), 60000);
      return;
    }

    if (["on", "off"].includes(args[0])) {
      await threadsData.set(event.threadID, args[0] === "on", "settings.pokebot");
      return message.reply(`Pokébot is now ${args[0] === "on" ? "enabled" : "disabled"}`);
    }

    return message.reply("Usage:\n• on/off\n• collection [page]\n• view <pokemon> [shiny]");
  },

  onChat: async function ({ message, event, threadsData }) {
    const threadID = event.threadID;
    const pokebot = await threadsData.get(threadID, "settings.pokebot");
    if (!pokebot) return;

    if (!pokeTimers[threadID]) pokeTimers[threadID] = { count: 0 };
    pokeTimers[threadID].count++;

    if (pokeTimers[threadID].count >= 30) {
      pokeTimers[threadID].count = 0;

      setTimeout(async () => {
        const pokos = JSON.parse(fs.readFileSync("pokos.json"));
        const poke = pokos[Math.floor(Math.random() * pokos.length)];
        const shiny = Math.floor(Math.random() * 50) === 0;
        const url = getPokemonImageUrl(poke.id, shiny);

        const msg = await message.send({
          body: shiny ? "✨ A **SHINY** Pokémon appeared! ✨\nReply with its name to catch it!" : "A wild Pokémon appeared!\nReply with its name to catch it!",
          attachment: await global.utils.getStreamFromURL(url)
        });

        global.GoatBot.onReply.set(msg.messageID, {
          commandName: "pokebot",
          name: poke.name.toLowerCase(),
          shiny,
          id: poke.id,
          threadID,
          messageID: msg.messageID,
          caught: false,
          pendingUsers: new Set()
        });
      }, 10000);
    }
  },

  onReply: async function ({ event, message, Reply, usersData }) {
    if (Reply.type === "collectionPage") {
      const key = Reply.key;
      const state = lastCollectionState[key];
      if (!state) return;

      const { userPokemon, pokemonCounts, sortedNames, totalPages, currentPage } = state;
      let newPage = currentPage;

      // Handle navigation commands
      const body = event.body.toLowerCase();
      if (body === "next" || body === "n") {
        newPage = Math.min(currentPage + 1, totalPages);
      } else if (body === "prev" || body === "p" || body === "previous") {
        newPage = Math.max(currentPage - 1, 1);
      } else if (/^page \d+$/.test(body)) {
        newPage = parseInt(body.split(" ")[1]);
        newPage = Math.min(Math.max(newPage, 1), totalPages);
      } else {
        // Handle Pokémon view requests
        const pokemonMatch = body.match(/^([a-z-]+)(?:\s+shiny)?$/);
        if (pokemonMatch) {
          const pokemonName = pokemonMatch[1];
          const shinyRequested = body.includes("shiny");
          
          if (pokemonCounts[pokemonName] && (shinyRequested ? pokemonCounts[pokemonName].shiny > 0 : true)) {
            await message.unsend(state.messageID);
            
            const caughtPokemon = JSON.parse(fs.readFileSync('./caughtPokemon.json', 'utf8'));
            const owned = (caughtPokemon[Reply.userID] || []).filter(p => 
              p.name.toLowerCase() === pokemonName && (!shinyRequested || p.shiny)
            );
            
            if (owned.length) {
              const info = owned.sort((a, b) => new Date(b.caughtAt) - new Date(a.caughtAt))[0];
              const imageUrl = getPokemonImageUrl(info.id, info.shiny);
              const date = new Date(info.caughtAt).toLocaleString();

              const response = `ℹ️ Pokémon Info:\n\nName: ${info.name}\nType: ${info.shiny ? "✨ Shiny ✨" : "Normal"}\nCaught on: ${date}\nID: ${info.id}\nOT: ${info.originalTrainer || "Unknown"}`;

              const msg = await message.reply({ 
                body: response, 
                attachment: await global.utils.getStreamFromURL(imageUrl) 
              });
              setTimeout(() => message.unsend(msg.messageID), 60000);
              return;
            }
          }
        }
        return;
      }

      if (newPage === currentPage) return;

      const slice = sortedNames.slice((newPage - 1) * 10, newPage * 10);
      let response = `🌍 Your Pokémon Collection (Page ${newPage}/${totalPages}):\n\n`;
      response += `🔹 Total Caught: ${userPokemon.length}\n`;
      response += `🔹 Unique Species: ${sortedNames.length}\n`;
      response += `✨ Total Shinies: ${Object.values(pokemonCounts).reduce((a, b) => a + b.shiny, 0)}\n\n`;

      slice.forEach(name => {
        const { normal, shiny } = pokemonCounts[name];
        response += `• ${name} - Normal: ${normal}, Shiny: ${shiny}\n`;
      });

      response += `\nReply with:\n- "next" or "prev" to navigate\n- "<pokemon>" to view details\n- "<pokemon> shiny" for shiny versions`;

      await message.unsend(state.messageID);
      const reply = await message.reply(response);
      lastCollectionState[key] = { ...state, currentPage: newPage, messageID: reply.messageID };
      global.GoatBot.onReply.set(reply.messageID, Reply);
      setTimeout(() => message.unsend(reply.messageID), 60000);
      return;
    }

    if (Reply.commandName === "pokebot") {
      if (Reply.pendingUsers.has(event.senderID)) return;
      Reply.pendingUsers.add(event.senderID);

      const guess = event.body.toLowerCase();
      if (Reply.caught) return message.reply("This Pokémon has already been caught!");

      const correct = Reply.name.toLowerCase();
      const alt = correct.replace(/-/g, " ");
      if (guess === correct || guess === alt) {
        Reply.caught = true;
        const { coins, exp } = getPokemonRewards(Reply.id, Reply.shiny);

        const trainerName = await usersData.getName(event.senderID);
        const pokemonData = {
          id: Reply.id,
          name: Reply.name,
          shiny: Reply.shiny,
          caughtAt: new Date().toISOString(),
          coins,
          exp,
          originalTrainer: trainerName
        };

        if (!saveCaughtPokemon(event.senderID, pokemonData)) return message.reply("Failed to save Pokémon.");
        const userData = await usersData.get(event.senderID);
        await usersData.set(event.senderID, {
          money: (userData.money || 0) + coins,
          exp: (userData.exp || 0) + exp
        });

        await message.unsend(Reply.messageID);
        const imageUrl = getPokemonImageUrl(Reply.id, Reply.shiny);
        await message.reply({
          body: `🎉 You caught ${Reply.shiny ? "a ✨ SHINY ✨ " : "a "}${Reply.name}! +${coins} coins, +${exp} EXP!`,
          attachment: await global.utils.getStreamFromURL(imageUrl)
        });
        global.GoatBot.onReply.delete(Reply.messageID);
      } else {
        message.reply("❌ Wrong answer!");
      }
      Reply.pendingUsers.delete(event.senderID);
    }
  }
};