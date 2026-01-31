const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "poketrade",
    aliases: ["trade"],
    version: "3.0",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    shortDescription: "Trade Pokémon or view trade log",
    longDescription: {
      en: "Sell your Pokémon for coins or gift to others.\n/poketrade <pokemon> [shiny] <coins> @user\n/poketrade log — view recent trades"
    },
    category: "pokebot",
    guide: { en: "{pn} <pokemon> [shiny] [coins] @user or {pn} log" }
  },

  onStart: async function ({ message, event, args, usersData }) {
    const filePath = './caughtPokemon.json';
    const logPath = './tradeLog.json';

    if (args[0] === "log") {
        if (!fs.existsSync(logPath)) return message.reply("No trade log found.");
        const log = JSON.parse(fs.readFileSync(logPath));
        if (!log.length) return message.reply("No trades recorded yet.");
        const recent = log.slice(-5).reverse();
        return message.reply("📒 Recent Trades:\n\n" + recent.map(e => `• ${e}`).join("\n"));
    }

    if (!fs.existsSync(filePath)) return message.reply("No Pokémon data found. Start catching first!");
    const caughtPokemon = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const senderID = event.senderID;
    const mentions = Object.keys(event.mentions);

    // 1. Check for mentions first (this is what you asked about)
    let targetID = mentions[0];
    
    // 2. If no mention, check for UID pattern
    if (!targetID) {
        for (const arg of args) {
            const uidMatch = arg.match(/uid[_\s]?(\d+)/i) || arg.match(/\(\s*uid[_\s]?(\d+)\s*\)/i);
            if (uidMatch) {
                targetID = uidMatch[1];
                break;
            }
        }
    }

    if (!targetID) return message.reply("Mention a user or specify a UID to trade with!");

    const isShiny = args.includes("shiny");
    
    // Find coin argument (exclude mentions and UIDs)
    const coinArg = args.find(arg => !isNaN(arg) && !arg.includes('@') && !/(uid|\(\s*uid)[_\s]?\d+\)?/i.test(arg));
    const coins = coinArg ? parseInt(coinArg) : 0;
    
    // Find Pokémon name (exclude shiny, coins, mentions, and UIDs)
    const pokemonName = args.find(arg => 
        !['shiny', coinArg].includes(arg) && 
        !arg.startsWith('@') && 
        !/(uid|\(\s*uid)[_\s]?\d+\)?/i.test(arg)
    )?.toLowerCase();

    if (!pokemonName) return message.reply("Specify a Pokémon to trade!");

    const yourPokemon = (caughtPokemon[senderID] || []).find(p => 
        p.name.toLowerCase() === pokemonName && (isShiny ? p.shiny : true)
    );
    if (!yourPokemon) return message.reply(`You don't have ${isShiny ? "a shiny " : "a "}${pokemonName}!`);

    if (coins > 0) {
        const targetBalance = await usersData.get(targetID, "money");
        if (targetBalance < coins) return message.reply(`They don't have enough coins (needed: ${coins})!`); 
    }

    const senderName = await usersData.getName(senderID);
    const targetName = await usersData.getName(targetID);

    let tradeMessage = `🔔 **Trade Offer**\n\n` +
        `${senderName} wants to ${coins > 0 ? "sell" : "gift"}:\n` +
        `- ${yourPokemon.name} (${yourPokemon.shiny ? "✨ Shiny" : "Normal"})`;
    if (coins > 0) tradeMessage += `\nFor ${coins} coins.`;
    tradeMessage += `\n\nReply "accept" to confirm or "reject" to cancel.`;

    const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${yourPokemon.shiny ? 'shiny/' : ''}${yourPokemon.id}.png`;

    const offerMsg = await message.reply({
        body: tradeMessage,
        attachment: await global.utils.getStreamFromURL(imageUrl)
    });

    global.GoatBot.onReply.set(offerMsg.messageID, {
        commandName: "poketrade",
        messageID: offerMsg.messageID,
        senderID,
        targetID,
        pokemonName,
        coins
    });
},

  onReply: async function ({ event, Reply, message, usersData }) {
    const { messageID, senderID, targetID, pokemonName, coins } = Reply;
    const filePath = './caughtPokemon.json';
    const logPath = './tradeLog.json';
    const caughtPokemon = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (event.senderID !== targetID) return message.reply("Only the trade recipient can respond!");

    switch (event.body.toLowerCase()) {
      case "accept": {
        const senderList = caughtPokemon[senderID] || [];
        const index = senderList.findIndex(p => p.name.toLowerCase() === pokemonName);
        if (index === -1) return message.reply("Trade failed: Pokémon not found.");

        const traded = senderList.splice(index, 1)[0];
        if (!caughtPokemon[targetID]) caughtPokemon[targetID] = [];
        caughtPokemon[targetID].push(traded);

        if (coins > 0) {
          await usersData.set(targetID, {
            money: (await usersData.get(targetID, "money")) - coins
          });
          await usersData.set(senderID, {
            money: (await usersData.get(senderID, "money")) + coins
          });
        }

        fs.writeFileSync(filePath, JSON.stringify(caughtPokemon, null, 2));

        const senderName = await usersData.getName(senderID);
        const targetName = await usersData.getName(targetID);
        const logLine = `${senderName} traded ${traded.shiny ? "shiny " : ""}${traded.name} to ${targetName}${coins > 0 ? ` for ${coins} coins` : " as a gift"}.`;
        let log = [];
        if (fs.existsSync(logPath)) log = JSON.parse(fs.readFileSync(logPath));
        log.push(logLine);
        fs.writeFileSync(logPath, JSON.stringify(log.slice(-100), null, 2));

        await message.reply(`✅ Trade confirmed!${coins > 0 ? `\n- ${coins} coins transferred.` : ""}`);
        break;
      }
      case "reject":
        await message.reply("🚫 Trade cancelled.");
        break;
      default:
        return message.reply("Invalid response. Use 'accept' or 'reject'.");
    }

    await message.unsend(messageID);
    global.GoatBot.onReply.delete(messageID);
  }
};
