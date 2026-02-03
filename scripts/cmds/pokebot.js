const fs = require("fs");
const path = require("path");
const pendingTrades = {};

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

function getUserPokemon(userID, pokemonName, shiny = false) {
  const filePath = './caughtPokemon.json';
  if (!fs.existsSync(filePath)) return [];
  
  const caughtPokemon = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const userPokemon = caughtPokemon[userID] || [];
  
  return userPokemon.filter(p => 
    p.name.toLowerCase() === pokemonName.toLowerCase() && 
    p.shiny === shiny
  );
}

function removePokemon(userID, pokemonIndex) {
  const filePath = './caughtPokemon.json';
  let caughtPokemon = {};
  try {
    if (!fs.existsSync(filePath)) return false;
    
    caughtPokemon = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!caughtPokemon[userID]) return false;
    
    if (pokemonIndex >= 0 && pokemonIndex < caughtPokemon[userID].length) {
      const removed = caughtPokemon[userID].splice(pokemonIndex, 1)[0];
      fs.writeFileSync(filePath, JSON.stringify(caughtPokemon, null, 2));
      return removed;
    }
    return false;
  } catch (err) {
    console.error("Remove error:", err);
    return false;
  }
}

function findPokemonIndex(userID, pokemonName, shiny = false) {
  const filePath = './caughtPokemon.json';
  if (!fs.existsSync(filePath)) return -1;
  
  const caughtPokemon = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const userPokemon = caughtPokemon[userID] || [];
  
  for (let i = 0; i < userPokemon.length; i++) {
    const p = userPokemon[i];
    if (p.name.toLowerCase() === pokemonName.toLowerCase() && p.shiny === shiny) {
      return i;
    }
  }
  return -1;
}

function findUserByMention(mention, participants) {
  if (!mention) return null;
  
  // Check if mention is a Facebook UID (numbers only)
  if (/^\d+$/.test(mention)) {
    return mention;
  }
  
  // Check if it's a mention format @user or similar
  const mentionRegex = /@?(\[.*?\]|\d+)/;
  const match = mention.match(mentionRegex);
  if (match) {
    // Extract UID from mention
    const mentionText = match[1];
    if (/^\d+$/.test(mentionText)) {
      return mentionText;
    }
    // If it's in format [uid:...], extract it
    const uidMatch = mentionText.match(/uid:(\d+)/);
    if (uidMatch) {
      return uidMatch[1];
    }
  }
  
  return null;
}

const lastCollectionState = {};
const pokeTimers = {};
const pendingTrades = {};

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
      en: "{pn} [on|off|collection [page]|view <pokemon> [shiny]|trade <pokemon> <@user|uid>]"
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
      
      // Enhanced view with trade history
      let response = `ℹ️ Pokémon Info:\n\n`;
      response += `Name: ${info.name}\n`;
      response += `Type: ${info.shiny ? "✨ Shiny ✨" : "Normal"}\n`;
      response += `Caught on: ${date}\n`;
      response += `ID: ${info.id}\n`;
      response += `OT: ${info.originalTrainer || "Unknown"}\n`;
      
      // Show trade history if exists
      if (info.tradeHistory && info.tradeHistory.length > 0) {
        response += `\nTrade History (${info.tradeHistory.length}):\n`;
        info.tradeHistory.forEach((trade, index) => {
          const tradeDate = new Date(trade.date).toLocaleDateString();
          response += `  ${index + 1}. ${trade.from} → ${trade.to} (${tradeDate})\n`;
        });
      }

      const msg = await message.reply({ body: response, attachment: await global.utils.getStreamFromURL(imageUrl) });
      setTimeout(() => message.unsend(msg.messageID), 60000);
      return;
    }

    if (args[0] === "trade") {
      if (!args[1]) return message.reply("Use: /pokebot trade <pokemon> <@user or uid>\nExample: /pokebot trade pichu @friend or /pokebot trade pichu 71998999");
      
      const pokemonName = args[1].toLowerCase();
      const targetUserInput = args.slice(2).join(" ");
      
      if (!targetUserInput) return message.reply("You need to mention a user or provide their UID!");
      
      const targetUserID = findUserByMention(targetUserInput, event.participantIDs || []);
      
      if (!targetUserID) return message.reply("Invalid user mention or UID! Please use @mention or provide the user's Facebook UID.");
      
      if (targetUserID === userID) return message.reply("You can't trade with yourself!");
      
      // Check if shiny version was specified
      const isShiny = pokemonName.includes(" shiny");
      const cleanPokemonName = isShiny ? pokemonName.replace(" shiny", "") : pokemonName;
      
      // Check if user has the specific Pokémon (normal or shiny)
      const specificPokemon = getUserPokemon(userID, cleanPokemonName, isShiny);
      if (specificPokemon.length === 0) {
        const type = isShiny ? "shiny" : "normal";
        return message.reply(`You don't have a ${type} ${cleanPokemonName} to trade!`);
      }
      
      // Check if target user exists
      try {
        const targetUser = await usersData.get(targetUserID);
        if (!targetUser) return message.reply("Target user not found!");
      } catch (error) {
        return message.reply("Target user not found!");
      }
      
      // Create trade offer
      const tradeID = `${userID}_${targetUserID}_${Date.now()}`;
      pendingTrades[tradeID] = {
        senderID: userID,
        receiverID: targetUserID,
        pokemonName: cleanPokemonName,
        isShiny: isShiny,
        pokemonIndex: findPokemonIndex(userID, cleanPokemonName, isShiny),
        createdAt: Date.now(),
        threadID: event.threadID
      };
      
      // Clean old trades (older than 1 hour)
      for (const tid in pendingTrades) {
        if (Date.now() - pendingTrades[tid].createdAt > 3600000) {
          delete pendingTrades[tid];
        }
      }
      
      const senderName = await usersData.getName(userID);
      const receiverName = await usersData.getName(targetUserID);
      
      const tradeMessage = `🔄 **TRADE OFFER** 🔄\n\n`
        + `From: ${senderName}\n`
        + `To: ${receiverName}\n`
        + `Offering: ${isShiny ? "✨ " : ""}${cleanPokemonName}\n`
        + `OT: ${specificPokemon[0].originalTrainer}\n\n`
        + `Type "accept" within 5 minutes to accept this trade.\n`
        + `Type "reject" or "decline" to reject it.`;
      
      const msg = await message.reply(tradeMessage);
      
      // Store trade info with message ID for reply handling
      pendingTrades[tradeID].messageID = msg.messageID;
      
      // Set timeout to auto-delete trade offer after 5 minutes
      setTimeout(() => {
        if (pendingTrades[tradeID]) {
          message.reply(`⌛ Trade offer for ${isShiny ? "✨ " : ""}${cleanPokemonName} has expired.`);
          delete pendingTrades[tradeID];
        }
      }, 300000); // 5 minutes
      
      return;
    }

    if (["on", "off"].includes(args[0])) {
      await threadsData.set(event.threadID, args[0] === "on", "settings.pokebot");
      return message.reply(`Pokébot is now ${args[0] === "on" ? "enabled" : "disabled"}`);
    }

    return message.reply("Usage:\n• on/off\n• collection [page]\n• view <pokemon> [shiny]\n• trade <pokemon> <@user or uid>");
  },

  onChat: async function ({ message, event, threadsData }) {
    const threadID = event.threadID;
    const pokebot = await threadsData.get(threadID, "settings.pokebot");
    if (!pokebot) return;

    // Initialize timer for this thread if not exists
    if (!pokeTimers[threadID]) {
      pokeTimers[threadID] = {
        messageCount: 0,
        isScheduled: false,
        scheduledTimeout: null
      };
    }

    const timer = pokeTimers[threadID];
    
    // Increment message count
    timer.messageCount++;
    
    // If we've reached 10 messages and no spawn is scheduled, schedule one
    if (timer.messageCount >= 10 && !timer.isScheduled) {
      timer.messageCount = 0; // Reset counter
      timer.isScheduled = true; // Mark as scheduled
      
      // Random time between 1-5 minutes (in milliseconds)
      const randomDelay = Math.floor(Math.random() * (5 - 1 + 1) + 1) * 60 * 1000;
      
      timer.scheduledTimeout = setTimeout(async () => {
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
        
        // Reset scheduling flag after spawn
        pokeTimers[threadID].isScheduled = false;
        pokeTimers[threadID].scheduledTimeout = null;
        
      }, randomDelay);
    }
  },

  onReply: async function ({ event, message, Reply, usersData }) {
  const replyText = event.body.toLowerCase().trim();
  
  // Handle trade accept/reject FIRST (before checking other reply types)
  if (replyText === "accept" || replyText === "reject" || replyText === "decline") {
    const isAccept = replyText === "accept";
    const senderID = event.senderID;
    
    console.log(`Trade response: ${replyText} from ${senderID}`);
    
    // Find pending trade for this user
    let tradeID = null;
    for (const tid in pendingTrades) {
      const trade = pendingTrades[tid];
      console.log(`Checking trade ${tid}: receiver=${trade.receiverID}, thread=${trade.threadID}, currentThread=${event.threadID}`);
      
      if (trade.receiverID === senderID && trade.threadID === event.threadID) {
        tradeID = tid;
        console.log(`Found matching trade: ${tradeID}`);
        break;
      }
    }
    
    if (!tradeID) {
      console.log(`No pending trade found for user ${senderID} in thread ${event.threadID}`);
      return message.reply("❌ No pending trade offer found for you.");
    }
    
    const trade = pendingTrades[tradeID];
    
    if (isAccept) {
      // ACCEPT TRADE
      console.log(`Processing trade acceptance for ${trade.pokemonName}`);
      const { senderID, receiverID, pokemonName, isShiny, pokemonIndex } = trade;
      
      // Verify sender still has the Pokémon
      const senderPokemon = getUserPokemon(senderID, pokemonName, isShiny);
      if (senderPokemon.length === 0) {
        message.reply("❌ Trade failed: Sender no longer has this Pokémon.");
        delete pendingTrades[tradeID];
        return;
      }
      
      // Get the specific Pokémon to trade
      const pokemonToTrade = senderPokemon[0];
      
      // Remove from sender (use the stored index)
      const removedPokemon = removePokemon(senderID, pokemonIndex);
      if (!removedPokemon) {
        // If index method fails, try to find and remove any matching Pokémon
        const filePath = './caughtPokemon.json';
        if (fs.existsSync(filePath)) {
          let caughtPokemon = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (caughtPokemon[senderID]) {
            const userPokemon = caughtPokemon[senderID];
            // Find and remove first matching Pokémon
            for (let i = 0; i < userPokemon.length; i++) {
              const p = userPokemon[i];
              if (p.name.toLowerCase() === pokemonName.toLowerCase() && p.shiny === isShiny) {
                const removed = userPokemon.splice(i, 1)[0];
                fs.writeFileSync(filePath, JSON.stringify(caughtPokemon, null, 2));
                removedPokemon = removed;
                break;
              }
            }
          }
        }
        
        if (!removedPokemon) {
          message.reply("❌ Trade failed: Could not remove Pokémon from sender.");
          delete pendingTrades[tradeID];
          return;
        }
      }
      
      // Add to receiver - OT STAYS THE SAME
      const newPokemonData = {
        ...removedPokemon,
        // Original Trainer stays unchanged!
        // Add/update trade history
        tradeHistory: [...(removedPokemon.tradeHistory || []), {
          from: await usersData.getName(senderID),
          to: await usersData.getName(receiverID),
          date: new Date().toISOString(),
          threadID: event.threadID
        }]
      };
      
      if (!saveCaughtPokemon(receiverID, newPokemonData)) {
        // Try to return Pokémon to sender if save fails
        saveCaughtPokemon(senderID, removedPokemon);
        message.reply("❌ Trade failed: Could not save Pokémon to receiver.");
        delete pendingTrades[tradeID];
        return;
      }
      
      const senderName = await usersData.getName(senderID);
      const receiverName = await usersData.getName(receiverID);
      
      const successMessage = `✅ Trade successful!\n\n`
        + `Trade: ${senderName} → ${receiverName}\n`
        + `Pokémon: ${isShiny ? "✨ " : ""}${pokemonName}\n`
        + `Original Trainer: ${removedPokemon.originalTrainer}\n`
        + `Total Trades: ${newPokemonData.tradeHistory.length}`;
      
      await message.reply(successMessage);
      
      // Notify sender
      try {
        await message.send(`✅ Your ${isShiny ? "✨ " : ""}${pokemonName} has been traded to ${receiverName}!`, senderID);
      } catch (e) {
        console.log("Could not notify sender:", e.message);
      }
      
    } else {
      // REJECT TRADE
      const senderName = await usersData.getName(trade.senderID);
      await message.reply(`❌ Trade rejected!\n\n${senderName}'s offer for ${trade.isShiny ? "✨ " : ""}${trade.pokemonName} has been declined.`);
      
      // Notify sender
      try {
        await message.send(`❌ ${receiverName} rejected your trade offer for ${trade.isShiny ? "✨ " : ""}${trade.pokemonName}.`, trade.senderID);
      } catch (e) {
        console.log("Could not notify sender:", e.message);
      }
    }
    
    // Clean up
    delete pendingTrades[tradeID];
    return;
  }

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
              
              // Enhanced view with trade history
              let response = `ℹ️ Pokémon Info:\n\n`;
              response += `Name: ${info.name}\n`;
              response += `Type: ${info.shiny ? "✨ Shiny ✨" : "Normal"}\n`;
              response += `Caught on: ${date}\n`;
              response += `ID: ${info.id}\n`;
              response += `OT: ${info.originalTrainer || "Unknown"}\n`;
              
              // Show trade history if exists
              if (info.tradeHistory && info.tradeHistory.length > 0) {
                response += `\nTrade History (${info.tradeHistory.length}):\n`;
                info.tradeHistory.forEach((trade, index) => {
                  const tradeDate = new Date(trade.date).toLocaleDateString();
                  response += `  ${index + 1}. ${trade.from} → ${trade.to} (${tradeDate})\n`;
                });
              }

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
          originalTrainer: trainerName,
          tradeHistory: [] // Initialize empty trade history
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
