const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

module.exports = {
  config: {
    name: "dice",
    version: "6.0",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    shortDescription: "Ultimate Dice Battle with VIP Benefits",
    longDescription: "Advanced dice game with VIP perks, progressive multipliers, and strategic gameplay",
    category: "game",
    guide: {
      en: "/dice <amount>"
    }
  },

  onStart: async function ({ event, api, args, usersData, message }) {
    try {
      const isAdmin = event.senderID === "100031021522664";
      const format = this.formatNumber;
      
      // Load VIP status from bank system
      const bankData = await this.loadBankData();
      const now = moment();
      const vipStatus = this.getVipStatus(event.senderID, bankData, now, isAdmin);

      // 💎 VIP BENEFITS CONFIGURATION
      const VIP_BENEFITS = {
        diamond: {
          minMultiplier: 2.2,
          maxMultiplier: 5,
          taxReduction: 1.0,
          cooldownReduction: 0.7,
          winChanceBoost: 0.1,
          specialEventChance: 0.25
        },
        gold: {
          minMultiplier: 2.1,
          maxMultiplier: 4,
          taxReduction: 0.5,
          cooldownReduction: 0.85,
          winChanceBoost: 0.05,
          specialEventChance: 0.2
        },
        silver: {
          minMultiplier: 2.05,
          maxMultiplier: 3.5,
          taxReduction: 0.8,
          cooldownReduction: 0.9,
          winChanceBoost: 0.02,
          specialEventChance: 0.15
        },
        none: {
          minMultiplier: 2.0,
          maxMultiplier: 3.0,
          taxReduction: 1.0,
          cooldownReduction: 1.0,
          winChanceBoost: 0.0,
          specialEventChance: 0.1
        }
      };
      
      const vipLevel = vipStatus.type;
      const benefits = VIP_BENEFITS[vipLevel] || VIP_BENEFITS.none;

      // 💰 ENHANCED BET LIMITS
      const MIN_BET = 50;
      const MAX_BET = vipLevel === 'diamond' ? 500000 : 
                     vipLevel === 'gold' ? 250000 : 
                     vipLevel === 'silver' ? 150000 : 
                     100000;
      
      const userData = await usersData.get(event.senderID);
      const balancePercent = vipLevel === 'diamond' ? 0.5 : 
                           vipLevel === 'gold' ? 0.4 : 
                           vipLevel === 'silver' ? 0.35 : 
                           0.3;
      const dynamicMax = Math.min(MAX_BET, Math.floor(userData.money * balancePercent));
      
      let betAmount;
      if (isAdmin) {
        betAmount = parseInt(args[0]) || 9999999;
      } else {
        betAmount = parseInt(args[0]);
        
        if (!betAmount || isNaN(betAmount)) {
          return message.reply(
            `🎲 Usage: /dice <amount>\n` +
            `Min: ${format(MIN_BET)} | Max: ${format(dynamicMax)}\n` +
            `${vipLevel !== 'none' ? `💎 VIP ${vipLevel.toUpperCase()} benefits active!` : ''}`
          );
        }
        if (betAmount < MIN_BET) {
          return message.reply(`💰 Minimum bet: ${format(MIN_BET)}$`);
        }
        if (betAmount > dynamicMax) {
          return message.reply(
            `🚫 Maximum bet: ${format(dynamicMax)}$ (${balancePercent*100}% of your balance)\n` +
            `${vipLevel === 'none' ? '💡 Upgrade to VIP for higher limits!' : ''}`
          );
        }
        if (betAmount > userData.money) {
          return message.reply(`❌ You only have ${format(userData.money)}$`);
        }
      }

      // Initialize global streak tracker
      if (!global.diceStats) global.diceStats = {};
      if (!global.diceStats[event.senderID]) {
        global.diceStats[event.senderID] = {
          winStreak: 0,
          lossStreak: 0,
          lastPlay: 0,
          lifetimeWins: 0,
          lifetimeLosses: 0
        };
      }

      // ⏳ COOLDOWN SYSTEM
      const baseCooldownTimes = {
        small: 3000,
        medium: 8000,
        large: 15000
      };
      
      const cooldownKey = betAmount < 5000 ? 'small' : betAmount < 20000 ? 'medium' : 'large';
      const cooldownTime = baseCooldownTimes[cooldownKey] * benefits.cooldownReduction;
      const lastPlayTime = global.diceStats[event.senderID].lastPlay;
      
      if (!isAdmin && Date.now() - lastPlayTime < cooldownTime) {
        const remaining = Math.ceil((cooldownTime - (Date.now() - lastPlayTime)) / 1000);
        return message.reply(
          `⏳ Cooldown: ${remaining}s\n` +
          `${vipLevel === 'none' ? '💡 VIP members get reduced cooldowns!' : ''}`
        );
      }

      // 🎲 GAME LOGIC (Fixed missing parenthesis)
      const playerRoll = isAdmin 
        ? Math.max(4, Math.floor(Math.random() * 6) + 1)
        : Math.floor(Math.random() * 6) + 1;

      const baseWinChance = (0.6 - Math.min(0.2, global.diceStats[event.senderID].winStreak * 0.05)) + benefits.winChanceBoost;
      const botRoll = Math.random() < baseWinChance 
        ? Math.min(6, playerRoll + Math.floor(Math.random() * 2) + 1)
        : Math.max(1, playerRoll - Math.floor(Math.random() * 2) - 1);

      // 🎰 SPECIAL EVENTS
      let specialEvent = null;
      if (Math.random() < benefits.specialEventChance) {
        const events = [
          "double",
          "crit",
          "shield",
          "reverse",
          "vipbonus"
        ];
        specialEvent = events[Math.floor(Math.random() * events.length)];
        
        if (specialEvent === "vipbonus" && vipLevel === "none") {
          specialEvent = events[Math.floor(Math.random() * 3)];
        }
      }

      // 💸 PAYOUT CALCULATION
      let winMultiplier = benefits.minMultiplier;
      let taxRate = 0.15 * benefits.taxReduction;
      
      if (specialEvent === "double") winMultiplier = 3;
      if (specialEvent === "crit") winMultiplier = benefits.maxMultiplier;
      if (specialEvent === "shield") taxRate = 0;
      if (specialEvent === "vipbonus") {
        winMultiplier = benefits.maxMultiplier;
        taxRate = 0;
      }
      
      const grossWinnings = betAmount * winMultiplier;
      taxRate = grossWinnings < 50000 ? 0.10 * benefits.taxReduction : 
               grossWinnings < 200000 ? 0.20 * benefits.taxReduction : 
               0.30 * benefits.taxReduction;
      
      const streakBonus = Math.min(0.5, global.diceStats[event.senderID].winStreak * 0.05 * (vipLevel === 'diamond' ? 1.5 : vipLevel === 'gold' ? 1.25 : 1));
      winMultiplier += streakBonus;

      // 👑 ADMIN OVERRIDE
      if (isAdmin) {
        const adminFlair = ["👑", "💎", "🦹‍♂️", "♛"][Math.floor(Math.random() * 4)];
        return message.reply(
          `${adminFlair} [ADMIN DICE] ${adminFlair}\n` +
          `▸ Your Roll: ${playerRoll}\n` +
          `▸ Bot Roll: ${botRoll}\n\n` +
          `💰 WIN: ${format(betAmount * 3)}$ (NO TAX)\n` +
          `⚡ ${["Perfect!", "Flawless!", "Dominating!", "Unstoppable!"][Math.floor(Math.random() * 4)]}\n` +
          `💎 BALANCE: ∞`
        );
      }

      // 🏆 RESULTS CALCULATION
      let winnings = 0;
      let resultMsg = "";
      let didWin = false;

      if (specialEvent === "reverse") {
        didWin = playerRoll < botRoll;
      } else {
        didWin = playerRoll > botRoll;
      }

      if (didWin) {
        const tax = Math.floor(grossWinnings * taxRate);
        winnings = grossWinnings - tax;
        
        resultMsg = `🎲 [DICE BATTLE] 🎲\n` +
                   `▸ Your Roll: ${playerRoll}\n` +
                   `▸ Bot Roll: ${botRoll}\n\n` +
                   `${vipLevel !== 'none' ? `💎 VIP ${vipLevel.toUpperCase()} Benefits Active!\n` : ''}` +
                   `${specialEvent ? `⚡ EVENT: ${specialEvent.toUpperCase()}${specialEvent === 'vipbonus' ? ' (VIP EXCLUSIVE)' : ''}!\n` : ''}` +
                   `💰 GROSS: ${format(grossWinnings)}$ (${winMultiplier.toFixed(1)}x)\n` +
                   `${taxRate > 0 ? `📉 TAX: ${Math.round(taxRate*100)}% (-${format(tax)}$)\n` : ''}` +
                   `💵 NET: +${format(winnings)}$\n` +
                   `${global.diceStats[event.senderID].winStreak > 2 ? `🔥 STREAK: ${global.diceStats[event.senderID].winStreak} wins!\n` : ''}` +
                   `💳 BALANCE: ${format(userData.money + winnings)}$`;
        
        global.diceStats[event.senderID].winStreak++;
        global.diceStats[event.senderID].lossStreak = 0;
        global.diceStats[event.senderID].lifetimeWins++;
      } 
      else if (playerRoll === botRoll) {
        const refundPercent = specialEvent === "shield" ? 1 : 
                            vipLevel === 'diamond' ? 0.9 :
                            vipLevel === 'gold' ? 0.85 :
                            vipLevel === 'silver' ? 0.8 : 
                            0.7;
        winnings = Math.floor(betAmount * refundPercent);
        resultMsg = `🎲 [DICE BATTLE] 🎲\n` +
                   `▸ Both Rolled: ${playerRoll}\n\n` +
                   `${specialEvent === "shield" ? `🛡️ SHIELD ACTIVATED! Full refund!\n` : 
                   `🔄 TIE! ${Math.round(refundPercent*100)}% refund${vipLevel !== 'none' ? ' (VIP Boost)' : ''}\n`}` +
                   `💸 RETURNED: ${format(winnings)}$\n` +
                   `💳 BALANCE: ${format(userData.money + winnings)}$`;
      } 
      else {
        winnings = -betAmount;
        resultMsg = `🎲 [DICE BATTLE] 🎲\n` +
                   `▸ Your Roll: ${playerRoll}\n` +
                   `▸ Bot Roll: ${botRoll}\n\n` +
                   `${specialEvent === "shield" ? `🛡️ SHIELD ACTIVATED! Loss prevented!\n` : '💀 LOST: ' + format(betAmount) + '$\n'}` +
                   `💸 BALANCE: ${format(userData.money + (specialEvent === "shield" ? 0 : -betAmount))}$`;
        
        if (specialEvent !== "shield") {
          global.diceStats[event.senderID].lossStreak++;
          global.diceStats[event.senderID].winStreak = 0;
          global.diceStats[event.senderID].lifetimeLosses++;
        }
      }

      // 💰 UPDATE BALANCE
      if (specialEvent !== "shield" || didWin || playerRoll === botRoll) {
        userData.money += winnings;
        await usersData.set(event.senderID, userData);
      }

      global.diceStats[event.senderID].lastPlay = Date.now();

      // 🎉 ENHANCED FEEDBACK
      await message.reply(resultMsg);
      
      if (didWin && winnings > betAmount * 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const winLevels = [
          `🎉 Nice win! Try /double ${format(winnings)}?`,
          `✨ Great roll! ${format(winnings)}$ richer!`,
          `🏆 DOMINATING! Won ${format(winnings)}$!`,
          `💰 JACKPOT ROLL! ${format(winnings)}$!`,
          `💎 VIP EXCLUSIVE WIN! ${format(winnings)}$!`
        ];
        
        const winIndex = vipLevel === 'diamond' ? 4 : 
                        vipLevel === 'gold' ? 3 : 
                        vipLevel === 'silver' ? 2 : 
                        Math.min(3, Math.floor(winnings / betAmount) - 2);
        
        await message.reply(winLevels[winIndex]);
      }

      if (winnings < -betAmount * 0.5 && vipLevel === 'none') {
        await new Promise(resolve => setTimeout(resolve, 3000));
        await message.reply(
          `💡 Tip: VIP members get:\n` +
          `- Higher win chances\n` +
          `- Bigger payouts\n` +
          `- Lower taxes\n` +
          `- Special bonuses!\n` +
          `Use /bank vip info to learn more!`
        );
      }

    } catch (error) {
      console.error("Dice error:", error);
      return message.reply("❌ System error. Please try again later!");
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
    if (absNum >= 1000000) return `$${(num/1000000).toFixed(1)}M ${absNum >= 5000000 ? '💎' : '💰'}`;
    if (absNum >= 1000) return `$${(num/1000).toFixed(1)}K ⚡`;
    return `$${num.toString()}`;
  }
};