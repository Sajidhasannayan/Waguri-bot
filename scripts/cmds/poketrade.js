const fs = require("fs");
const path = require("path");

function getPokemonImageUrl(id, shiny) {
  return shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`
    : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
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

function saveCaughtPokemon(userID, pokemonData) {
  const filePath = './caughtPokemon.json';
  let caughtPokemon = {};
  try {
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf8').trim();
      if (fileContent) {
        caughtPokemon = JSON.parse(fileContent);
      }
    }
    if (!caughtPokemon[userID]) caughtPokemon[userID] = [];
    caughtPokemon[userID].push(pokemonData);
    fs.writeFileSync(filePath, JSON.stringify(caughtPokemon, null, 2));
    return true;
  } catch (err) {
    console.error("Save error:", err);
    return false;
  }
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

// Store pending trades
const pendingTrades = {};

module.exports = {
  config: {
    name: "poketrade",
    aliases: ["ptrade", "trade"],
    version: "1.0",
    author: "SajidMogged",
    countDown: 1,
    role: 0,
    shortDescription: {
      en: "Trade Pokémon with other users"
    },
    Description: {
      en: "Simple Pokémon trading system"
    },
    category: "pokemon",
    guide: {
      en: "{pn} <pokemon> <@user or uid>\nExample: {pn} pikachu @friend"
    }
  },

  onStart: async function ({ message, event, args, usersData }) {
    if (args.length < 2) {
      return message.reply("Usage: /poketrade <pokemon> <@user or uid>\nExample: /poketrade pichu @friend\nUse: /poketrade pikachu shiny @friend for shiny");
    }
    
    const userID = event.senderID;
    const pokemonName = args[0].toLowerCase();
    const targetUserInput = args.slice(1).join(" ");
    
    // Check if shiny version was specified
    const isShiny = pokemonName.includes(" shiny");
    const cleanPokemonName = isShiny ? pokemonName.replace(" shiny", "") : pokemonName;
    
    // Check if user has the Pokémon
    const specificPokemon = getUserPokemon(userID, cleanPokemonName, isShiny);
    if (specificPokemon.length === 0) {
      const type = isShiny ? "shiny" : "normal";
      return message.reply(`You don't have a ${type} ${cleanPokemonName} to trade!`);
    }
    
    // Find target user
    const targetUserID = findUserByMention(targetUserInput, event.participantIDs || []);
    
    if (!targetUserID) {
      return message.reply("Please mention a user or provide their UID!\nExample: /poketrade pikachu @friend");
    }
    
    if (targetUserID === userID) {
      return message.reply("You can't trade with yourself!");
    }
    
    // Check if target user exists
    try {
      const targetUser = await usersData.get(targetUserID);
      if (!targetUser) {
        return message.reply("Target user not found!");
      }
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
    const pokemonData = specificPokemon[0];
    
    const tradeMessage = `🔄 **POKÉMON TRADE OFFER** 🔄\n\n`
      + `👤 From: ${senderName}\n`
      + `🎯 To: ${receiverName}\n`
      + `🎁 Offering: ${isShiny ? "✨ " : ""}${cleanPokemonName}\n`
      + `📜 OT: ${pokemonData.originalTrainer}\n\n`
      + `Type "accept" to accept this trade.\n`
      + `Type "reject" to reject it.\n\n`
      + `⚠️ Trade expires in 5 minutes.`;
    
    const msg = await message.reply(tradeMessage);
    
    // Store trade message ID
    pendingTrades[tradeID].messageID = msg.messageID;
    
    // Set timeout to auto-expire
    setTimeout(() => {
      if (pendingTrades[tradeID]) {
        delete pendingTrades[tradeID];
        message.reply(`⌛ Trade offer for ${isShiny ? "✨ " : ""}${cleanPokemonName} has expired.`);
      }
    }, 300000); // 5 minutes
    
    return;
  },

  onReply: async function ({ event, message, Reply, usersData }) {
    const replyText = event.body.toLowerCase().trim();
    
    // Only handle trade responses
    if (replyText === "accept" || replyText === "reject") {
      const isAccept = replyText === "accept";
      const senderID = event.senderID;
      
      // Find pending trade for this user
      let tradeID = null;
      for (const tid in pendingTrades) {
        const trade = pendingTrades[tid];
        if (trade.receiverID === senderID && trade.threadID === event.threadID) {
          tradeID = tid;
          break;
        }
      }
      
      if (!tradeID) {
        return message.reply("❌ No pending trade offer found for you.");
      }
      
      const trade = pendingTrades[tradeID];
      
      if (isAccept) {
        // ACCEPT TRADE
        const { senderID, receiverID, pokemonName, isShiny, pokemonIndex } = trade;
        
        // Verify sender still has the Pokémon
        const senderPokemon = getUserPokemon(senderID, pokemonName, isShiny);
        if (senderPokemon.length === 0) {
          message.reply("❌ Trade failed: Sender no longer has this Pokémon.");
          delete pendingTrades[tradeID];
          return;
        }
        
        // Remove from sender
        const removedPokemon = removePokemon(senderID, pokemonIndex);
        if (!removedPokemon) {
          message.reply("❌ Trade failed: Could not remove Pokémon from sender.");
          delete pendingTrades[tradeID];
          return;
        }
        
        // Add to receiver - OT STAYS THE SAME
        const newPokemonData = {
          ...removedPokemon,
          // Add trade history
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
        
        const successMessage = `✅ **TRADE COMPLETED!**\n\n`
          + `🔄 ${senderName} → ${receiverName}\n`
          + `🎁 ${isShiny ? "✨ " : ""}${pokemonName}\n`
          + `📜 OT: ${removedPokemon.originalTrainer}\n`
          + `📊 Total Trades: ${newPokemonData.tradeHistory.length}`;
        
        await message.reply(successMessage);
        
        // Show Pokémon image
        try {
          const imageUrl = getPokemonImageUrl(removedPokemon.id, isShiny);
          await message.reply({
            body: `🎉 ${receiverName} received ${isShiny ? "a ✨ Shiny ✨ " : "a "}${pokemonName}!`,
            attachment: await global.utils.getStreamFromURL(imageUrl)
          });
        } catch (e) {
          console.log("Image error:", e.message);
        }
        
      } else {
        // REJECT TRADE
        const senderName = await usersData.getName(trade.senderID);
        const receiverName = await usersData.getName(trade.receiverID);
        
        await message.reply(`❌ **TRADE REJECTED**\n\n${receiverName} rejected ${senderName}'s offer for ${trade.isShiny ? "✨ " : ""}${trade.pokemonName}.`);
      }
      
      // Clean up
      delete pendingTrades[tradeID];
      return;
    }
  }
};
