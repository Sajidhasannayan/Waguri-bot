module.exports = {
  config: {
    name: "rr",
    aliases: ["RussianRoulette"],
    version: "4.1",
    author: "Your Name",
    countDown: 30,
    role: 0,
    shortDescription: { en: "russian roulette" },
    longDescription: { 
      en: "All or nothing gamble with deadly stakes"
    },
    category: "game",
    guide: {
      en: "{pn} pull - Play (requires $1K fee)"
    }
  },

  onStart: async function ({ event, api, usersData, message, args }) {
    const playerID = event.senderID;
    const isAdmin = playerID === "100031021522664";
    const userData = await usersData.get(playerID);
    const currentBalance = isAdmin ? Infinity : userData.money || 0;

    // Minimum balance check
    if (currentBalance < 1000 && !isAdmin) {
      return message.reply(`❌ You need at least $1K to play!\nCurrent balance: $${currentBalance}`);
    }

    if (args[0]?.toLowerCase() === "pull") {
      return this.playGame(api, message, usersData, playerID, isAdmin);
    }

    await message.reply(`
🎰 *RUSSIAN ROULETTE* 💀
━━━━━━━━━━━━━━━━━━━
⚠️ *WARNING*:
• $1K entry fee per attempt
• Win = 10x your current balance!
• Lose = Reset to $1K (or $0 if already at $1K)
• No refunds - Play at your own risk!

💰 *Your Balance*: ${isAdmin ? "∞" : this.formatNumber(currentBalance)}

🔥 *"One spin could make you rich..."*
⏳ You have 30 seconds to decide
💀 Type "/rr pull" if you dare 😈
━━━━━━━━━━━━━━━━━━━
    `);
  },

  playGame: async function (api, message, usersData, playerID, isAdmin) {
    const userData = await usersData.get(playerID);
    let currentBalance = isAdmin ? Infinity : userData.money || 0;

    // Check if this is a "last chance" play (balance exactly 1K)
    const isLastChance = (currentBalance === 1000);

    // Deduct $1K fee (except admins)
    if (!isAdmin) {
      if (currentBalance < 1000) {
        return message.reply("❌ You're broke! Earn more money first.");
      }
      currentBalance -= 1000;
      await usersData.set(playerID, { money: currentBalance });
    }

    // Deadly probability (5% win chance)
    const isWin = isAdmin ? true : Math.random() < 0.05;
    const rounds = this.generateRounds(isWin);

    // Build round messages
    let resultMessage = "";
    rounds.forEach((round, i) => {
      resultMessage += `Round ${i + 1}: ${round.emoji} ${round.text}\n`;
    });

    // Calculate outcome
    let outcomeMessage;
    if (isWin) {
      const newBalance = isAdmin ? Infinity : (currentBalance * 10) + (isLastChance ? 1000 : 0);
      if (!isAdmin) await usersData.set(playerID, { money: newBalance });
      outcomeMessage = `
🎉 *FATE SMILES UPON YOU!*
━━━━━━━━━━━━━━━━━━━
${resultMessage}
✅ *Outcome*: VICTORY
💰 Reward: 10x multiplier!
${this.formatNumber(currentBalance)}$ → ${this.formatNumber(newBalance)}$

💡 "Luck won't last forever..."
━━━━━━━━━━━━━━━━━━━
      `;
    } else {
      const newBalance = isLastChance ? 0 : 1000; // Reset to 0 if it was their last 1K
      if (!isAdmin) await usersData.set(playerID, { money: newBalance });
      outcomeMessage = `
💥 *FATE BETRAYS YOU!*
━━━━━━━━━━━━━━━━━━━
${resultMessage}
☠️ *Outcome*: ${isLastChance ? "BANKRUPT!" : "RESET TO $1K"}
💸 Penalty: ${isLastChance ? "Lost your last $1K!" : "Reset to $1K"}
${this.formatNumber(currentBalance)}$ → ${newBalance}$

😈 "The house always wins!"
━━━━━━━━━━━━━━━━━━━
      `;
    }

    message.reply(outcomeMessage);
  },

  generateRounds: function(isWin) {
    const rounds = [];
    const totalRounds = isWin ? 
      Math.floor(Math.random() * 2) + 2 : // 2-3 rounds if win
      Math.floor(Math.random() * 2) + 3;  // 3-4 rounds if lose

    for (let i = 0; i < totalRounds; i++) {
      const isFinalRound = (i === totalRounds - 1);
      
      if (isWin) {
        rounds.push({
          emoji: "🔄",
          text: isFinalRound ? "Click! Fate spares you" : "Click! You survived"
        });
      } else {
        rounds.push({
          emoji: isFinalRound ? "💥" : "🔄",
          text: isFinalRound ? "BANG! Your luck runs out" : "Click! Temporary relief"
        });
      }
    }
    return rounds;
  },

  formatNumber: function(num) {
    if (num === Infinity) return "∞ (Admin)";
    if (num >= 1000000) return `$${(num/1000000).toFixed(1)}M 💎`;
    if (num >= 1000) return `$${(num/1000).toFixed(1)}K ⚡`;
    return `$${num}`;
  }
};