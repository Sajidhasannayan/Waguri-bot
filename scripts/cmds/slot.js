const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

module.exports = {
  config: {
    name: "slot",
    version: "6.1", // Updated version
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    shortDescription: { en: "Advanced Slot Machine with VIP Perks" 
                      },
    longDescription: { en: "A thrilling slot game with progressive jackpots, VIP benefits, and bonus rounds" },
    category: "game",
    guide: {
      en: "{pn} <amount>"
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
      const vipLevel = vipStatus.type;

      // 💎 VIP BENEFITS CONFIGURATION
      const VIP_BENEFITS = {
        diamond: {
          minMultiplier: 1.5,
          maxMultiplier: 5,
          taxReduction: 0.0, // Tax-free for Diamond VIPs
          cooldownReduction: 0.7,
          winChanceBoost: 0.1,
          specialEventChance: 0.25,
          jackpotContribution: 0.005, // Lower contribution to jackpot
          maxBet: 500000
        },
        gold: {
          minMultiplier: 1.3,
          maxMultiplier: 4,
          taxReduction: 0.5,
          cooldownReduction: 0.85,
          winChanceBoost: 0.05,
          specialEventChance: 0.2,
          jackpotContribution: 0.0075,
          maxBet: 250000
        },
        silver: {
          minMultiplier: 1.2,
          maxMultiplier: 3.5,
          taxReduction: 0.8,
          cooldownReduction: 0.9,
          winChanceBoost: 0.02,
          specialEventChance: 0.15,
          jackpotContribution: 0.009,
          maxBet: 150000
        },
        none: {
          minMultiplier: 1.0,
          maxMultiplier: 3.0,
          taxReduction: 1.0,
          cooldownReduction: 1.0,
          winChanceBoost: 0.0,
          specialEventChance: 0.1,
          jackpotContribution: 0.01,
          maxBet: 100000
        }
      };

      const benefits = VIP_BENEFITS[vipLevel] || VIP_BENEFITS.none;

      // 💰 BET LIMITS
      const MIN_BET = 50;
      const MAX_BET = benefits.maxBet;
      const userData = await usersData.get(event.senderID);
      const userBalance = userData.money || 0;
      const balancePercent = vipLevel === 'diamond' ? 0.5 :
                           vipLevel === 'gold' ? 0.4 :
                           vipLevel === 'silver' ? 0.35 :
                           0.25;
      const dynamicMaxBet = Math.min(MAX_BET, Math.floor(userBalance * balancePercent));

      let betAmount;
      if (isAdmin) {
        betAmount = parseInt(args[0]) || 9999999;
      } else {
        betAmount = parseInt(args[0]);
        if (!betAmount || isNaN(betAmount)) {
          return message.reply(
            `🎰 Usage: /slot <amount>\n` +
            `Min: ${format(MIN_BET)} | Max: ${format(dynamicMaxBet)}\n` +
            `${vipLevel !== 'none' ? `💎 VIP ${vipLevel.toUpperCase()} benefits active!` : ''}`
          );
        }
        if (betAmount < MIN_BET) {
          return message.reply(`💰 Minimum bet: ${format(MIN_BET)}$`);
        }
        if (betAmount > dynamicMaxBet) {
          return message.reply(
            `🚫 Maximum bet: ${format(dynamicMaxBet)}$ (${balancePercent*100}% of your balance)\n` +
            `${vipLevel === 'none' ? '💡 Upgrade to VIP for higher limits!' : ''}`
          );
        }
        if (betAmount > userBalance) {
          return message.reply(`❌ You only have ${format(userBalance)}$`);
        }
      }

      // ⏳ COOLDOWN SYSTEM
      if (!global.slotStats) global.slotStats = {};
      if (!global.slotStats[event.senderID]) {
        global.slotStats[event.senderID] = { lastPlay: 0 };
      }
      const baseCooldownTimes = {
        small: 5000,
        medium: 10000,
        large: 20000
      };
      const cooldownKey = betAmount < 5000 ? 'small' : betAmount < 20000 ? 'medium' : 'large';
      const cooldownTime = baseCooldownTimes[cooldownKey] * benefits.cooldownReduction;
      const lastPlayTime = global.slotStats[event.senderID].lastPlay;

      if (!isAdmin && Date.now() - lastPlayTime < cooldownTime) {
        const remaining = Math.ceil((cooldownTime - (Date.now() - lastPlayTime)) / 1000);
        return message.reply(
          `⏳ Cooldown: ${remaining}s\n` +
          `${vipLevel === 'none' ? '💡 VIP members get reduced cooldowns!' : ''}`
        );
      }

      // Initialize global jackpot
      if (!global.slotJackpot) {
        global.slotJackpot = {
          pool: 0,
          lastWin: null
        };
      }
      if (typeof global.slotJackpot.pool !== 'number') {
        global.slotJackpot.pool = 0;
      }

      // Add to jackpot pool
      if (!isAdmin) {
        global.slotJackpot.pool += Math.floor(betAmount * benefits.jackpotContribution);
      }

      // 🎰 SYMBOL TABLE
      const slots = [
        { emoji: "🍒", freq: isAdmin ? 0 : 40, payout: { 2: 1.5 * benefits.minMultiplier, 3: 3 * benefits.minMultiplier } },
        { emoji: "🍋", freq: isAdmin ? 0 : 30, payout: { 2: 1.2 * benefits.minMultiplier, 3: 4 * benefits.minMultiplier } },
        { emoji: "🍊", freq: isAdmin ? 10 : 15, payout: { 3: 5 * benefits.minMultiplier } },
        { emoji: "💎", freq: isAdmin ? 50 : 10, payout: { 2: 2 * benefits.minMultiplier, 3: 10 * benefits.minMultiplier } },
        { emoji: "7️⃣", freq: isAdmin ? 40 : 5, payout: { 3: 15 * benefits.minMultiplier } },
        { emoji: "💰", freq: isAdmin ? 0 : 0.5 * (1 + benefits.winChanceBoost), payout: { 3: 25 * benefits.maxMultiplier } }
      ];

      // 🎬 FIXED ANIMATION
      const spinAnimation = async () => {
        const frames = [
          "🎰 | 🌈 | 🚀\n▰▰▰ SPINNING ▰▰▰",
          "💸 | 💎 | 👑\n▰▰▰ SPINNING ▰▰▰",
          "💰 | 🏆 | ✨\n▰▰▰ SPINNING ▰▰▰",
          "🌀 | 🔮 | 🌠\n▰▰▰ SECOND REEL ▰▰▰",
          "⚡ | ⚡ | ⚡\n▰▰▰ FINAL REEL ▰▰▰",
          "🎉 | 🎉 | 🎉\n▰▰▰ RESULTS... ▰▰▰"
        ];
        let msg;
        try {
          msg = await message.reply(frames[0]);
          for (let i = 1; i < frames.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 500 + (i * 150))); // Slower, smoother animation
            await api.editMessage(frames[i], msg.messageID);
          }
        } catch (error) {
          console.error("Animation error:", error);
          if (!msg) msg = await message.reply("🎰 Spinning...");
        }
        return msg;
      };
      const spinMsg = await spinAnimation();

      // 🎯 RESULTS GENERATION
      let results = [];
      let bonusRound = false;
      let specialEvent = null;

      if (isAdmin) {
        results = ["7️⃣", "7️⃣", "7️⃣"];
      } else {
        // Special event chance
        if (Math.random() < benefits.specialEventChance) {
          const events = ["freespin", "multiplier", "retry"];
          specialEvent = events[Math.floor(Math.random() * events.length)];
          await api.editMessage(`🎉 SPECIAL EVENT: ${specialEvent.toUpperCase()}!`, spinMsg.messageID);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Generate reels
        for (let i = 0; i < 2; i++) {
          const rand = Math.random() * 100;
          let cumulative = 0;
          for (const slot of slots) {
            cumulative += slot.freq * (1 + benefits.winChanceBoost);
            if (rand <= cumulative) {
              results.push(slot.emoji);
              break;
            }
          }
        }

        // Bonus round chance
        if (Math.random() < 0.1 * (1 + benefits.winChanceBoost) && results[0] === results[1]) {
          bonusRound = true;
          await api.editMessage("🎉 BONUS ROUND! Spinning final reel...", spinMsg.messageID);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

        // Third reel
        const finalRand = Math.random() * (bonusRound ? 80 : 100);
        let finalCumulative = 0;
        for (const slot of slots) {
          finalCumulative += slot.freq * (bonusRound && slot.emoji === results[0] ? 1.5 : 1) * (1 + benefits.winChanceBoost);
          if (finalRand <= finalCumulative) {
            results.push(slot.emoji);
            break;
          }
        }
      }

      // 💸 WIN CALCULATION
      let winMultiplier = 0;
      const matched = {
        triple: results[0] === results[1] && results[1] === results[2],
        double: results[0] === results[1] || results[1] === results[2]
      };

      const slotType = slots.find(s => s.emoji === results[0]);
      if (matched.triple) {
        if (slotType?.payout[3]) {
          winMultiplier = slotType.payout[3];
        }
        if (results[0] === "💰") {
          winMultiplier = 25 * benefits.maxMultiplier;
          if (!isAdmin) {
            winMultiplier += Math.floor(global.slotJackpot.pool / betAmount);
            global.slotJackpot.lastWin = {
              user: event.senderID,
              amount: betAmount * winMultiplier,
              time: Date.now()
            };
            global.slotJackpot.pool = 0;
          }
        }
      } else if (matched.double && slotType?.payout[2]) {
        winMultiplier = slotType.payout[2];
      }

      // Special event effects
      if (specialEvent === "multiplier") {
        winMultiplier *= 1.5;
      } else if (specialEvent === "freespin" && winMultiplier === 0) {
        userData.money += betAmount; // Refund bet for free spin
        winMultiplier = 0.1; // Small consolation multiplier
      }

      // DYNAMIC TAX SYSTEM
      const grossWinnings = betAmount * winMultiplier;
      let taxRate = grossWinnings > 0 ? 
        (grossWinnings < 50000 ? 0.10 : grossWinnings < 200000 ? 0.20 : 0.30) * benefits.taxReduction : 0;
      if (bonusRound) taxRate = Math.max(0.05, taxRate - 0.05);
      const tax = Math.floor(grossWinnings * taxRate);
      const netWinnings = grossWinnings - tax;

      // 👑 ADMIN OVERRIDE
      if (isAdmin) {
        return api.editMessage(
          `🎰 [ADMIN SLOTS] 🎰\n` +
          `${results.join(" | ")}\n\n` +
          `💰 GROSS: ${format(grossWinnings)}$ (${winMultiplier}x)\n` +
          `👑 TAX: 0% (Admin Privilege)\n` +
          `💎 NET: ${format(grossWinnings)}$\n` +
          `🪙 BALANCE: ∞`,
          spinMsg.messageID
        );
      }

      // 💰 UPDATE BALANCE
      userData.money += (winMultiplier ? netWinnings : -betAmount);
      if (userData.money < 0) userData.money = 0; // Prevent negative balance
      await usersData.set(event.senderID, userData);
      global.slotStats[event.senderID].lastPlay = Date.now();

      // ✨ RESULT DISPLAY
      let resultText = `🎰 ${results.join(" | ")}${bonusRound ? " (BONUS)" : ""}\n\n` +
                      `${vipLevel !== 'none' ? `💎 VIP ${vipLevel.toUpperCase()} Benefits Active!\n` : ''}` +
                      `${specialEvent ? `⚡ EVENT: ${specialEvent.toUpperCase()}!\n` : ''}`;

      if (winMultiplier > 0) {
        if (results[0] === "💰") {
          resultText += `💰 JACKPOT WIN! 💰\n` +
                       `⚡ MULTIPLIER: ${winMultiplier.toFixed(1)}x\n` +
                       `🏆 PRIZE: ${format(grossWinnings)}$\n` +
                       `${taxRate > 0 ? `📉 TAX: ${Math.round(taxRate*100)}% (-${format(tax)}$)\n` : `📉 TAX: None${vipLevel === 'diamond' ? ' (Diamond VIP Benefit)' : ' (Event Bonus)'}\n`}` +
                       `💎 NET: +${format(netWinnings)}$\n`;
        } else {
          resultText += `🎉 YOU WON!\n` +
                       `✨ MULTIPLIER: ${winMultiplier.toFixed(1)}x\n` +
                       `💰 PRIZE: ${format(grossWinnings)}$\n` +
                       `${taxRate > 0 ? `📉 TAX: ${Math.round(taxRate*100)}% (-${format(tax)}$)\n` : `📉 TAX: None${vipLevel === 'diamond' ? ' (Diamond VIP Benefit)' : ' (Event Bonus)'}\n`}` +
                       `💵 NET: +${format(netWinnings)}$\n`;
        }
        if (bonusRound) {
          resultText += `🎁 BONUS: Tax reduced by 5%!\n`;
        }
      } else {
        resultText += `😢 YOU LOST: ${format(betAmount)}$\n`;
        if (specialEvent === "freespin") {
          resultText += `🎁 FREESPIN: Bet refunded!\n`;
        }
      }

      resultText += `💳 BALANCE: ${format(userData.money)}$\n` +
                   `🎰 JACKPOT: ${format(global.slotJackpot.pool)}$ (${benefits.jackpotContribution*100}% of bet)`;

      await api.editMessage(resultText, spinMsg.messageID);

      // 🎉 WIN CELEBRATION
      if (winMultiplier > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (results[0] === "💰") {
          await message.reply(
            `🏆 JACKPOT CHAMPION! 🏆\n` +
            `You won ${format(netWinnings)}$ after tax!\n` +
            `The jackpot has been reset!`
          );
        } else if (winMultiplier >= 10) {
          await message.reply(
            `✨ LEGENDARY WIN! ✨\n` +
            `Try your luck again with /double ${format(netWinnings)}?`
          );
        } else if (winMultiplier >= 5) {
          await message.reply(
            `🎉 BIG WINNER! 🎉\n` +
            `Your ${format(netWinnings)}$ is ready to play again!`
          );
        }
      }

      // VIP Promotion
      if (winMultiplier === 0 && vipLevel === 'none') {
        await new Promise(resolve => setTimeout(resolve, 3000));
        await message.reply(
          `💡 Tip: VIP members get:\n` +
          `- Higher win chances\n` +
          `- Bigger payouts\n` +
          `- Lower/No taxes\n` +
          `- Special bonuses!\n` +
          `Use /bank vip info to learn more!`
        );
      }

    } catch (error) {
      console.error("Slot Machine Error:", error);
      return message.reply("❌ An error occurred. Please try again later.");
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