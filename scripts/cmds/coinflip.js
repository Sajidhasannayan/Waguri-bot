const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

module.exports = {
  config: {
    name: "coinflip",
    version: "5.3", // Updated version
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    shortDescription: "Ultimate Coinflip with VIP Perks & Chaos Mode",
    longDescription: { 
      en: "Dynamic betting game with VIP benefits, unpredictable outcomes, and progressive jackpots"
    },
    category: "game",
    guide: {
      en: "{pn} <amount> <heads/tails>"
    }
  },

  onStart: async function({ message, event, args, usersData, api }) {
    try {
      const { senderID } = event;
      const isAdmin = senderID === "100031021522664";
      const format = this.formatNumber;

      // Load VIP status
      const bankData = await this.loadBankData();
      const now = moment();
      const vipStatus = this.getVipStatus(senderID, bankData, now, isAdmin);
      const vipLevel = vipStatus.type;

      // 💎 VIP BENEFITS CONFIGURATION
      const VIP_BENEFITS = {
        diamond: {
          baseMultiplier: 2.0,
          maxMultiplier: 5,
          taxReduction: 0.0, // Tax-free
          cooldownReduction: 0.7,
          winChanceBoost: 0.1,
          specialEventChance: 0.25,
          jackpotContribution: 0.005,
          maxBet: 500000
        },
        gold: {
          baseMultiplier: 1.8,
          maxMultiplier: 4,
          taxReduction: 0.5,
          cooldownReduction: 0.85,
          winChanceBoost: 0.05,
          specialEventChance: 0.2,
          jackpotContribution: 0.0075,
          maxBet: 250000
        },
        silver: {
          baseMultiplier: 1.6,
          maxMultiplier: 3.5,
          taxReduction: 0.8,
          cooldownReduction: 0.9,
          winChanceBoost: 0.02,
          specialEventChance: 0.15,
          jackpotContribution: 0.009,
          maxBet: 150000
        },
        none: {
          baseMultiplier: 1.5,
          maxMultiplier: 3,
          taxReduction: 1.0,
          cooldownReduction: 1.0,
          winChanceBoost: 0.0,
          specialEventChance: 0.1,
          jackpotContribution: 0.01,
          maxBet: 100000
        }
      };

      const benefits = VIP_BENEFITS[vipLevel] || VIP_BENEFITS.none;

      // Initial validation
      if (args.length < 2) {
        return message.reply(
          `❌ Usage: /coinflip <amount> <heads/tails>\n` +
          `Min bet: ${format(50)} | Max bet: ${format(benefits.maxBet)}`
        );
      }

      const bet = parseInt(args[0]);
      let choice = args[1].toLowerCase();
      const validChoices = ["heads", "tails", "h", "t"];
      choice = choice === "h" ? "heads" : choice === "t" ? "tails" : choice;

      // Input validation
      if (isNaN(bet) || bet < 1) return message.reply("🔢 Please specify a valid bet amount");
      if (!validChoices.includes(choice)) {
        return message.reply("🔴 Choose 'heads' or 'tails' (or 'h'/'t')");
      }

      // Bet limits check
      const userData = await usersData.get(senderID);
      const balancePercent = vipLevel === 'diamond' ? 0.5 :
                           vipLevel === 'gold' ? 0.4 :
                           vipLevel === 'silver' ? 0.35 :
                           0.25;
      const maxAllowed = Math.min(benefits.maxBet, Math.floor(userData.money * balancePercent));
      if (bet < 50) return message.reply(`💰 Minimum bet: ${format(50)}$`);
      if (bet > maxAllowed && !isAdmin) {
        return message.reply(
          `🚫 Max bet: ${format(maxAllowed)}$ (${balancePercent*100}% of balance)\n` +
          `${vipLevel === 'none' ? '💡 Upgrade to VIP for higher limits!' : ''}`
        );
      }
      if (!isAdmin && userData.money < bet) {
        return message.reply(`❌ You only have ${format(userData.money)}$`);
      }

      // Initialize global data
      if (!global.coinflipData) {
        global.coinflipData = {
          cooldowns: {},
          playerStats: {},
          lastFlips: [],
          jackpot: { pool: 0, lastWin: null }
        };
      }
      if (!global.coinflipData.playerStats[senderID]) {
        global.coinflipData.playerStats[senderID] = { winStreak: 0, lossStreak: 0 };
      }

      // Cooldown system
      const cooldownTimes = {
        small: 5000,
        medium: 10000,
        large: 20000
      };
      const cooldownKey = bet < 5000 ? 'small' : bet < 20000 ? 'medium' : 'large';
      const cooldownTime = cooldownTimes[cooldownKey] * benefits.cooldownReduction;
      if (!isAdmin && global.coinflipData.cooldowns[senderID] && Date.now() - global.coinflipData.cooldowns[senderID] < cooldownTime) {
        const remaining = Math.ceil((cooldownTime - (Date.now() - global.coinflipData.cooldowns[senderID])) / 1000);
        return message.reply(
          `⏳ Cooldown: ${remaining}s (${cooldownKey} bet)\n` +
          `${vipLevel === 'none' ? '💡 VIP members get reduced cooldowns!' : ''}`
        );
      }

      // Add to jackpot pool
      if (!isAdmin) {
        global.coinflipData.jackpot.pool += Math.floor(bet * benefits.jackpotContribution);
      }

      // Animation
      const spin = async () => {
        const frames = [
          "🌀 Flipping...\n┌───┐\n│   │\n└───┘",
          "💫 Flipping...\n┌───┐\n│ ○ │\n└───┘",
          "⚡ Flipping...\n┌───┐\n│ ✧ │\n└───┘",
          "🌟 Final Flip...\n┌───┐\n│ * │\n└───┘",
          "🎉 Result...\n┌───┐\n│ ! │\n└───┘"
        ];
        let msg;
        try {
          msg = await message.reply(frames[0]);
          for (let i = 1; i < frames.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            await api.editMessage(frames[i], msg.messageID);
          }
        } catch (error) {
          console.error("Animation error:", error);
          if (!msg) msg = await message.reply("🌀 Flipping...");
        }
        return msg;
      };
      const spinMsg = await spin();

      // Chaos Engine
      function getOutcome() {
        const seed = (Date.now() + senderID) % 1000;
        const chaosLevel = Math.sin(seed) * 100;

        // Special events
        const specialEvent = Math.random() < benefits.specialEventChance ? 
          ["double", "reverse", "lightning", "jackpot", "shield"][Math.floor(Math.random() * 5)] : 
          null;

        // Base win chance
        let winChance = 0.45 + benefits.winChanceBoost;

        // Streak penalty
        const streak = global.coinflipData.playerStats[senderID].winStreak || 0;
        winChance -= Math.min(0.15, Math.floor(streak / 2) * 0.05);
        winChance = Math.max(0.3, Math.min(0.6, winChance));

        const isWin = Math.random() < winChance;

        return {
          result: isWin ? choice : (choice === "heads" ? "tails" : "heads"),
          specialEvent,
          winChance: Math.round(winChance * 100)
        };
      }

      const { result, specialEvent, winChance } = getOutcome();
      let win = result === choice;

      // Dynamic multipliers
      let multiplier = benefits.baseMultiplier;
      if (specialEvent === "double") multiplier = 2.5;
      if (specialEvent === "jackpot") multiplier = benefits.maxMultiplier;
      if (specialEvent === "lightning") multiplier = 2.0;
      if (specialEvent === "shield") multiplier = 0; // No loss
      if (specialEvent === "reverse") win = !win;

      // Progressive tax
      const taxBrackets = [
        { max: 1000, rate: 0.10 },
        { max: 5000, rate: 0.20 },
        { max: 20000, rate: 0.30 },
        { max: Infinity, rate: 0.40 }
      ];
      const baseTaxRate = taxBrackets.find(b => bet <= b.max).rate;
      const taxRate = specialEvent === "jackpot" ? 0 : baseTaxRate * benefits.taxReduction;

      // Calculate payout
      let payout;
      if (win || specialEvent === "shield") {
        let grossWin = Math.floor(bet * multiplier);
        if (specialEvent === "reverse") grossWin = -grossWin;
        if (specialEvent === "jackpot" && !isAdmin) {
          grossWin += global.coinflipData.jackpot.pool;
          global.coinflipData.jackpot.lastWin = {
            user: senderID,
            amount: grossWin,
            time: Date.now()
          };
          global.coinflipData.jackpot.pool = 0;
        }
        const tax = Math.floor(grossWin * taxRate);
        payout = grossWin - tax;
      } else {
        payout = -bet;
      }

      // Update player stats
      if (specialEvent !== "shield") {
        if (win) {
          global.coinflipData.playerStats[senderID].winStreak++;
          global.coinflipData.playerStats[senderID].lossStreak = 0;
        } else {
          global.coinflipData.playerStats[senderID].lossStreak++;
          global.coinflipData.playerStats[senderID].winStreak = 0;
        }
      }

      // Admin override
      if (isAdmin) {
        await api.editMessage(
          `👑 [ADMIN COINFLIP]\n${result === 'heads' ? "🟡 HEADS" : "🔴 TAILS"}\n` +
          `▸ Your choice: ${choice.toUpperCase()}\n` +
          `▸ Result: ${result.toUpperCase()}\n` +
          `💰 WIN: ${format(bet * 3)}$ (NO TAX)\n` +
          `💎 BALANCE: ∞`,
          spinMsg.messageID
        );
        return;
      }

      // Update balance
      userData.money += payout;
      if (userData.money < 0) userData.money = 0;
      await usersData.set(senderID, userData);
      global.coinflipData.cooldowns[senderID] = Date.now();

      // Result message
      let resultText = `${result === 'heads' ? "🟡 HEADS" : "🔴 TAILS"} ${specialEvent ? `[${specialEvent.toUpperCase()}]` : ''}\n` +
                      `${vipLevel !== 'none' ? `💎 VIP ${vipLevel.toUpperCase()} Benefits Active!\n` : ''}` +
                      `▸ You chose: ${choice.toUpperCase()}\n` +
                      `▸ Win chance: ${winChance}%\n` +
                      `▸ Multiplier: ${multiplier.toFixed(1)}x\n`;

      if (win || specialEvent === "shield") {
        if (specialEvent === "reverse") {
          resultText += `💢 REVERSE! Lost ${format(bet * multiplier)}$\n`;
        } else {
          resultText += `✨ WIN: ${format(bet * multiplier)}$\n`;
          if (taxRate > 0) {
            resultText += `📉 TAX: ${Math.round(taxRate * 100)}% (-${format(Math.floor(bet * multiplier * taxRate))})$\n`;
          } else {
            resultText += `📉 TAX: None${vipLevel === 'diamond' ? ' (Diamond VIP Benefit)' : ' (Event Bonus)'}\n`;
          }
          resultText += `💰 NET: +${format(payout)}$\n`;
        }
      } else {
        resultText += `💀 LOST: ${format(bet)}$\n`;
      }

      resultText += `💵 BALANCE: ${format(userData.money)}\n` +
                   `🎰 JACKPOT: ${format(global.coinflipData.jackpot.pool)}$ (${benefits.jackpotContribution * 100}% of bet)`;

      const streak = global.coinflipData.playerStats[senderID].winStreak;
      if (streak >= 3) resultText += `\n🔥 STREAK: ${streak} wins!`;

      await api.editMessage(resultText, spinMsg.messageID);

      // Special effects
      if (win || specialEvent === "shield") {
        await new Promise(resolve => setTimeout(resolve, 1500));
        let bonusMsg = "";
        if (specialEvent === "jackpot") {
          bonusMsg = `🎰 JACKPOT! Won ${format(bet * multiplier + global.coinflipData.jackpot.pool)} (TAX-FREE)`;
        } else if (specialEvent === "lightning") {
          bonusMsg = `⚡ LIGHTNING ROUND! ${multiplier.toFixed(1)}x multiplier`;
        } else if (specialEvent === "shield") {
          bonusMsg = `🛡️ SHIELD! Loss prevented!`;
        } else if (payout >= 50000) {
          bonusMsg = `🏦 High-stakes win!`;
        }
        if (bonusMsg) await message.reply(bonusMsg);
      }

      // VIP promotion
      if (!win && vipLevel === 'none' && !specialEvent) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await message.reply(
          `💡 Tip: VIP members get:\n` +
          `- Higher win chances\n` +
          `- Bigger multipliers\n` +
          `- Lower/No taxes\n` +
          `- Special events!\n` +
          `Use /bank vip info to learn more!`
        );
      }

    } catch (error) {
      console.error("CoinFlip Error:", error);
      message.reply("❌ An error occurred. Please try again later.");
    }
  },

  // Helper functions
  async loadBankData() {
    const dataFile = path.join(__dirname, 'balance_data.json');
    try {
      return JSON.parse(await fs.readFile(dataFile, 'utf8')) || { vip: {} };
    } catch {
      return { vip: {} };
    }
  },

  getVipStatus(userID, balanceData, now, isAdmin) {
    if (isAdmin) return { type: 'diamond', expires: null };
    const vip = balanceData.vip?.[userID];
    if (!vip) return { type: 'none', expires: null };
    if (moment(vip.expires).isBefore(now)) {
      delete balanceData.vip[userID];
      return { type: 'none', expires: null };
    }
    return { type: vip.type, expires: vip.expires };
  },

  formatNumber: function(num) {
    if (num === Infinity) return "∞ 💎";
    const absNum = Math.abs(num);
    if (absNum >= 1000000000) return `$${(num/1000000000).toFixed(1)}B 💎`;
    if (absNum >= 1000000) return `$${(num/1000000).toFixed(1)}M 💰`;
    if (absNum >= 1000) return `$${(num/1000).toFixed(1)}K ⚡`;
    return `$${num.toString()}`;
  }
};