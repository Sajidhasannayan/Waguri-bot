const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

module.exports = {
  config: {
    name: "bank",
    aliases: ["bal"],
    version: "4.2",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    description: {
      en: "Advanced banking system with VIP memberships, dynamic stocks and leaderboard"
    },
    category: "economy",
    guide: {
      en: "{pn}: Check balance\n" +
          "{pn} <@mention|uid>: Check others' balance (admin: full data)\n" +
          "{pn} send <amount> <@mention|uid>: Send money\n" +
          "{pn} deposit <amount|all>: Deposit money for interest\n" +
          "{pn} withdraw <amount|all>: Withdraw deposited money\n" +
          "{pn} loan <amount>: Take a loan (5K-50K, VIP: higher limits)\n" +
          "{pn} repay <amount|all>: Repay loan\n" +
          "{pn} stocks: View real-time stock market\n" +
          "{pn} portfolio: View your stock portfolio\n" +
          "{pn} buy <stock> <amount>: Buy stocks\n" +
          "{pn} sell <stock> <amount>: Sell stocks\n" +
          "{pn} top: Group leaderboard\n" +
          "{pn} top global: Global leaderboard\n" +
          "{pn} vip info [diamond|gold|silver]: View VIP membership details\n" +
          "{pn} active <diamond|gold|silver>: Purchase VIP membership\n" +
          "{pn} gift <diamond|gold|silver> <@mention|uid>: Gift VIP (admin)\n" +
          "{pn} deactivate <diamond|gold|silver> <@mention|uid>: Deactivate VIP (admin)\n" +
          "{pn} reset <amount> <@mention|uid>: Reset balance (admin)"
    }
  },

  langs: {
    en: {
      money: "💰 %1 has %2 (VIP: %3)",
      moneyOf: "💰 %1 has %2 (VIP: %3)",
      notEnoughMoney: "❌ Insufficient funds!",
      invalidAmount: "❌ Invalid amount! Please enter a positive number",
      invalidUser: "❌ Invalid user! Please tag or provide a valid UID",
      sendSuccess: "✅ Sent %1 to %2 (Tax: %3%)",
      adminMoney: "∞",
      topGroupTitle: "🏆 TOP 10 RICHEST (GROUP)",
      topGlobalTitle: "🌍 TOP 10 RICHEST (GLOBAL)",
      userEntry: "%1『%2』 %3: %4",
      notInGroup: "❌ This command requires a group chat!",
      noData: "📉 No data available yet",
      resetSuccess: "🔄 Set %1's balance to %2",
      noResetPermission: "⛔ Admin-only command!",
      userNotFound: "❌ User not found",
      depositSuccess: "✅ Deposited %1. Interest accrues daily",
      notEnoughDeposit: "❌ Insufficient deposit! You have %1",
      withdrawSuccess: "✅ Withdrew %1 (Tax: %2%). Received: %3",
      loanTaken: "✅ Received %1 loan. Repay with /bank repay",
      loanActive: "❌ You already have a loan of %1! Repay first",
      loanLimit: "❌ Loan must be between 5K and %1!",
      loanRepaid: "✅ Repaid %1 loan (Penalty: %2%)",
      noLoan: "❌ No loan to repay",
      invalidStock: "❌ Invalid stock! Available: jfry, hssx, tan, hawk, llp, sbai, nova, zeta, pulse, vega",
      buySuccess: "✅ Bought %1 %2 share(s) for %3",
      sellSuccess: "✅ Sold %1 %2 share(s) for %3 (Tax: %4%)",
      notEnoughStocks: "❌ You only have %1 %2 share(s)!",
      stockLimit: "❌ You've reached your daily stock purchase limit of %1!",
      stockOverview: "📊 Real-Time Stock Market\n⏰ Last Updated: %2\n━━━━━━━━━━━━━━━\n%1",
      portfolioTitle: "📈 Your Stock Portfolio\n⏰ Current Prices\n━━━━━━━━━━━━━━━\n%1",
      noStocks: "📉 You don't own any stocks yet",
      transactionHistory: "📜 Transaction History\n━━━━━━━━━━━━━━━\n%1",
      noTransactions: "📜 No transactions yet",
      marketTrend: "📊 Market Trend: %1",
      stockNews: "📰 Market News: %1",
      cooldown: "⏳ Please wait %1 seconds before using this command again",
      vipInfo: "💎 VIP Memberships\n━━━━━━━━━━━━━━━\n%1",
      vipInfoDiamond: "💎 Diamond Membership\nPrice: 5M\nDuration: 30 days\nBenefits:\n- No taxes\n- 5% daily interest\n- 500K loan limit\n- Unlimited stock purchases\n- Leaderboard badge: 💎",
      vipInfoGold: "🥇 Gold Membership\nPrice: 2M\nDuration: 15 days\nBenefits:\n- No taxes\n- 2% daily interest\n- 300K loan limit\n- 5000 daily stock purchases\n- Leaderboard badge: 🥇",
      vipInfoSilver: "🥈 Silver Membership\nPrice: 500K\nDuration: 7 days\nBenefits:\n- Reduced taxes\n- 0.5% daily interest\n- 100K loan limit\n- 1500 daily stock purchases\n- Leaderboard badge: 🥈",
      vipPurchaseSuccess: "✅ Activated %1 membership until %2!",
      vipAlreadyActive: "❌ You already have an active %1 membership until %2!",
      vipUpgradeSuccess: "✅ Upgraded to %1 membership until %2!",
      vipGiftSuccess: "✅ Gifted %1 membership to %2 until %3!",
      vipDeactivateSuccess: "✅ Deactivated %1's %2 membership!",
      vipInvalidType: "❌ Invalid VIP type! Use: diamond, gold, silver",
      adminFullData: "📊 Full Data for %1\n━━━━━━━━━━━━━━━\nBalance: %2\nVIP: %3\nDeposits: %4\nLoans: %5\nStocks: %6\nTransactions:\n%7"
    }
  },

  balanceCache: null,
  lastCacheUpdate: null,
  cacheTTL: 5 * 60 * 1000, // Cache for 5 minutes
  cooldowns: new Map(),
  stockPurchases: new Map(), // Track daily stock purchases

  formatNumber(num) {
    if (num === Infinity) return "∞";
    if (isNaN(num) || num === null) return "0";
    if (num < 0) return "-" + this.formatNumber(-num);
    if (num < 1000) return num.toString();

    const scales = [
      { value: 1e63, suffix: 'Vigintillion' },
      { value: 1e60, suffix: 'Novemdecillion' },
      { value: 1e57, suffix: 'Octodecillion' },
      { value: 1e54, suffix: 'Septendecillion' },
      { value: 1e51, suffix: 'Sexdecillion' },
      { value: 1e48, suffix: 'Quindecillion' },
      { value: 1e45, suffix: 'Quattuordecillion' },
      { value: 1e42, suffix: 'Tredecillion' },
      { value: 1e39, suffix: 'Duodecillion' },
      { value: 1e36, suffix: 'Undecillion' },
      { value: 1e33, suffix: 'Decillion' },
      { value: 1e30, suffix: 'Nonillion' },
      { value: 1e27, suffix: 'Octillion' },
      { value: 1e24, suffix: 'Septillion' },
      { value: 1e21, suffix: 'Sextillion' },
      { value: 1e18, suffix: 'Quintillion' },
      { value: 1e15, suffix: 'Quadrillion' },
      { value: 1e12, suffix: 'Trillion' },
      { value: 1e9, suffix: 'Billion' },
      { value: 1e6, suffix: 'Million' },
      { value: 1e3, suffix: 'Thousand' }
    ];

    for (const scale of scales) {
      if (num >= scale.value) {
        const formatted = (num / scale.value).toFixed(2);
        return formatted.endsWith('.00') ? formatted.slice(0, -3) + ' ' + scale.suffix : formatted + ' ' + scale.suffix;
      }
    }
    return num.toString();
  },

  getTargetUID(input) {
    const match = input.match(/@(\d+)/);
    return match ? match[1] : input;
  },

  calculateInterest(depositAmount, depositTime, lastInterestTime, now, vipStatus) {
    if (!depositAmount || depositAmount < 100000) return 0;
    const lastInterest = lastInterestTime ? moment(lastInterestTime) : moment(depositTime);
    const days = now.diff(lastInterest, 'days');
    if (days < 1) return 0;

    const interestRates = {
      diamond: 0.05, // 5% daily
      gold: 0.02,    // 2% daily
      silver: 0.005, // 0.5% daily
      none: 0.003    // 0.3% daily
    };
    const rate = interestRates[vipStatus] || interestRates.none;
    const interest = depositAmount * rate * days;
    return Math.floor(interest);
  },

  calculateLoanPenalty(loanAmount, loanTime, now, vipStatus) {
    if (!loanAmount || loanAmount <= 0) return 0;
    const days = now.diff(moment(loanTime), 'days');
    if (days < 1) return 0;

    const penaltyRates = {
      diamond: 0,    // No penalty
      gold: 0,       // No penalty
      silver: 0.005, // 0.5% daily
      none: 0.01     // 1% daily
    };
    const rate = penaltyRates[vipStatus] || penaltyRates.none;
    const penalty = loanAmount * rate * days;
    return Math.floor(penalty);
  },

  generateMarketNews(stockPrices) {
    const newsTemplates = [
      "%1 expected to %2 due to %3",
      "Breaking: %1 %2 as %3 impacts market",
      "%1 surges/falls with %3 developments",
      "Analysts warn %1 may %2 after %3"
    ];
    const stockNames = Object.keys(stockPrices);
    const stock = stockNames[Math.floor(Math.random() * stockNames.length)];
    const change = stockPrices[stock].price > stockPrices[stock].prevPrice ? "rise" : "fall";
    const reasons = [
      "strong earnings",
      "global economic shifts",
      "new product launch",
      "regulatory changes",
      "market speculation",
      "supply chain issues"
    ];
    const reason = reasons[Math.floor(Math.random() * reasons.length)];
    const template = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
    return template.replace("%1", stockPrices[stock].fullName).replace("%2", change).replace("%3", reason);
  },

  updateStockPrices(stockPrices, now) {
    const stocks = [
      { name: 'jfry', fullName: '$JFRY', ipoPrice: 1000, volatility: 0.08 },
      { name: 'hssx', fullName: '$HSSX', ipoPrice: 850, volatility: 0.12 },
      { name: 'tan', fullName: '$TAN', ipoPrice: 600, volatility: 0.15 },
      { name: 'hawk', fullName: '$HAWK', ipoPrice: 750, volatility: 0.10 },
      { name: 'llp', fullName: '$LLP', ipoPrice: 1000, volatility: 0.07 },
      { name: 'sbai', fullName: '$SBAI', ipoPrice: 500, volatility: 0.20 },
      { name: 'nova', fullName: '$NOVA', ipoPrice: 1200, volatility: 0.09 },
      { name: 'zeta', fullName: '$ZETA', ipoPrice: 700, volatility: 0.14 },
      { name: 'pulse', fullName: '$PULSE', ipoPrice: 900, volatility: 0.11 },
      { name: 'vega', fullName: '$VEGA', ipoPrice: 1100, volatility: 0.13 }
    ];

    const marketSentiment = Math.random() * 0.04 - 0.02;
    for (const stock of stocks) {
      if (!stockPrices[stock.name]) {
        stockPrices[stock.name] = {
          price: stock.ipoPrice,
          lastUpdated: now.toISOString(),
          ipoPrice: stock.ipoPrice,
          prevPrice: stock.ipoPrice,
          fullName: stock.fullName,
          volatility: stock.volatility,
          trend: "neutral"
        };
      } else {
        const lastUpdated = moment(stockPrices[stock.name].lastUpdated);
        const minutes = now.diff(lastUpdated, 'minutes');
        if (minutes >= 5) {
          let price = stockPrices[stock.name].price;
          const volatility = stockPrices[stock.name].volatility;
          const prevChange = (price - stockPrices[stock.name].prevPrice) / stockPrices[stock.name].prevPrice;
          const momentum = Math.min(0.5, Math.max(-0.5, prevChange * 0.7));
          const randomChange = (Math.random() * 2 - 1) * volatility;
          const totalChange = randomChange + momentum + marketSentiment;
          price *= (1 + totalChange);
          price = Math.max(50, Math.min(10000, Math.floor(price)));
          const changePercent = (price - stockPrices[stock.name].price) / stockPrices[stock.name].price;
          const trend = changePercent > 0.02 ? "bullish" : changePercent < -0.02 ? "bearish" : "neutral";
          stockPrices[stock.name] = {
            ...stockPrices[stock.name],
            price,
            lastUpdated: now.toISOString(),
            prevPrice: stockPrices[stock.name].price,
            trend
          };
        }
      }
    }
    return stockPrices;
  },

  async loadBalanceData() {
    const dataFile = path.join(__dirname, 'balance_data.json');
    const now = Date.now();
    if (this.balanceCache && this.lastCacheUpdate && (now - this.lastCacheUpdate < this.cacheTTL)) {
      return this.balanceCache;
    }
    try {
      this.balanceCache = JSON.parse(await fs.readFile(dataFile, 'utf8')) || {
        deposits: {}, loans: {}, lastInterest: {}, stocks: {}, stockPrices: {}, transactions: {}, vip: {}
      };
      this.lastCacheUpdate = now;
    } catch {
      this.balanceCache = { deposits: {}, loans: {}, lastInterest: {}, stocks: {}, stockPrices: {}, transactions: {}, vip: {} };
    }
    return this.balanceCache;
  },

  async saveBalanceData(data) {
    const dataFile = path.join(__dirname, 'balance_data.json');
    this.balanceCache = data;
    this.lastCacheUpdate = Date.now();
    await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8');
  },

  async addTransaction(userID, type, amount, details = {}) {
    const balanceData = await this.loadBalanceData();
    if (!balanceData.transactions) balanceData.transactions = {};
    if (!balanceData.transactions[userID]) balanceData.transactions[userID] = [];
    balanceData.transactions[userID].unshift({
      timestamp: new Date().toISOString(),
      type,
      amount,
      details
    });
    if (balanceData.transactions[userID].length > 20) balanceData.transactions[userID].pop();
    await this.saveBalanceData(balanceData);
  },

  checkCooldown(userID, command, cooldownSeconds) {
    const key = `${userID}:${command}`;
    const now = Date.now();
    const lastUsed = this.cooldowns.get(key) || 0;
    const timeLeft = (lastUsed + cooldownSeconds * 1000 - now) / 1000;
    if (timeLeft > 0) return timeLeft;
    this.cooldowns.set(key, now);
    return 0;
  },

  getVipStatus(userID, balanceData, now, isAdmin) {
    if (isAdmin) return { type: 'diamond', expires: null };
    const vip = balanceData.vip[userID];
    if (!vip) return { type: 'none', expires: null };
    if (moment(vip.expires).isBefore(now)) {
      delete balanceData.vip[userID];
      return { type: 'none', expires: null };
    }
    return { type: vip.type, expires: vip.expires };
  },

  checkStockPurchaseLimit(userID, amount, vipStatus, isAdmin, now) {
    if (isAdmin || vipStatus.type === 'diamond') return { allowed: true, limit: Infinity };
    
    const today = now.format('YYYY-MM-DD');
    const key = `${userID}:${today}`;
    const current = this.stockPurchases.get(key) || 0;
    
    const limits = { 
      none: 888, 
      silver: 1500, 
      gold: 5000,
      diamond: Infinity
    };
    
    const limit = limits[vipStatus.type] || limits.none;
    
    if (current + amount > limit) {
      return { allowed: false, limit };
    }
    
    this.stockPurchases.set(key, current + amount);
    return { allowed: true };
  },

  async onStart({ message, event, args, usersData, getLang, api }) {
    const { senderID, threadID, isGroup } = event;
    const isAdmin = senderID === "100074220753602";
    const formatNumber = this.formatNumber.bind(this);
    const now = moment().tz('Asia/Dhaka');

    if (!isAdmin) {
      const cooldownTime = this.checkCooldown(senderID, 'bank', this.config.countDown);
      if (cooldownTime > 0) {
        return message.reply(getLang("cooldown", cooldownTime.toFixed(1)));
      }
    }

    let balanceData = await this.loadBalanceData();
    balanceData.deposits[senderID] = balanceData.deposits[senderID] || { amount: 0, timestamp: null };
    balanceData.loans[senderID] = balanceData.loans[senderID] || { amount: 0, timestamp: null };
    balanceData.lastInterest[senderID] = balanceData.lastInterest[senderID] || null;
    balanceData.stocks[senderID] = balanceData.stocks[senderID] || {
      jfry: 0, hssx: 0, tan: 0, hawk: 0, llp: 0, sbai: 0, nova: 0, zeta: 0, pulse: 0, vega: 0
    };
    balanceData.transactions[senderID] = balanceData.transactions[senderID] || [];
    balanceData.vip = balanceData.vip || {};

    balanceData.stockPrices = this.updateStockPrices(balanceData.stockPrices, now);
    const vipStatus = this.getVipStatus(senderID, balanceData, now, isAdmin);

    if (args[0] === "vip" && args[1] === "info") {
      if (args[2]) {
        const type = args[2].toLowerCase();
        if (type === 'diamond') return message.reply(getLang("vipInfoDiamond"));
        if (type === 'gold') return message.reply(getLang("vipInfoGold"));
        if (type === 'silver') return message.reply(getLang("vipInfoSilver"));
        return message.reply(getLang("vipInvalidType"));
      }
      const info = `${getLang("vipInfoDiamond")}\n\n${getLang("vipInfoGold")}\n\n${getLang("vipInfoSilver")}`;
      return message.reply(getLang("vipInfo", info));
    }

    if (args[0] === "active" && args.length === 2) {
      const type = args[1].toLowerCase();
      if (!['diamond', 'gold', 'silver'].includes(type)) return message.reply(getLang("vipInvalidType"));
      const prices = { diamond: 5000000, gold: 2000000, silver: 500000 };
      const durations = { diamond: 30, gold: 15, silver: 7 };
      const price = prices[type];
      const currentVip = vipStatus.type;
      if (currentVip === type && vipStatus.expires) {
        return message.reply(getLang("vipAlreadyActive", type, moment(vipStatus.expires).format('MMM D, YYYY')));
      }
      if (currentVip !== 'none' && ['diamond', 'gold'].includes(currentVip) && type === 'silver') {
        return message.reply(getLang("vipAlreadyActive", currentVip, moment(vipStatus.expires).format('MMM D, YYYY')));
      }
      const senderMoney = (await usersData.get(senderID, "money")) || 0;
      if (!isAdmin && senderMoney < price) return message.reply(getLang("notEnoughMoney"));
      if (!isAdmin) await usersData.set(senderID, { money: senderMoney - price });
      const expires = now.clone().add(durations[type], 'days').toISOString();
      balanceData.vip[senderID] = { type, expires };
      await this.addTransaction(senderID, `vip_${type}_purchase`, -price);
      await this.saveBalanceData(balanceData);
      return message.reply(getLang(currentVip === 'none' ? "vipPurchaseSuccess" : "vipUpgradeSuccess", type, moment(expires).format('MMM D, YYYY')));
    }

    if (args[0] === "gift" && args.length === 3) {
      if (!isAdmin) return message.reply(getLang("noResetPermission"));
      const type = args[1].toLowerCase();
      if (!['diamond', 'gold', 'silver'].includes(type)) return message.reply(getLang("vipInvalidType"));
      const targetID = this.getTargetUID(args[2]);
      try {
        const targetInfo = await api.getUserInfo(targetID);
        if (!targetInfo[targetID]) {
          return message.reply(getLang("userNotFound"));
        }
        const targetName = targetInfo[targetID]?.name || targetID;
        const durations = { diamond: 30, gold: 15, silver: 7 };
        const expires = now.clone().add(durations[type], 'days').toISOString();
        balanceData.vip[targetID] = { type, expires };
        await this.addTransaction(targetID, `vip_${type}_gift`, 0, { from: senderID });
        await this.saveBalanceData(balanceData);
        return message.reply(getLang("vipGiftSuccess", type, targetName, moment(expires).format('MMM D, YYYY')));
      } catch (error) {
        console.error('Error gifting VIP:', error);
        return message.reply(getLang("userNotFound"));
      }
    }

    if (args[0] === "deactivate" && args.length === 3) {
      if (!isAdmin) return message.reply(getLang("noResetPermission"));
      const type = args[1].toLowerCase();
      if (!['diamond', 'gold', 'silver'].includes(type)) return message.reply(getLang("vipInvalidType"));
      const targetID = this.getTargetUID(args[2]);
      try {
        const targetInfo = await api.getUserInfo(targetID);
        if (!targetInfo[targetID]) {
          return message.reply(getLang("userNotFound"));
        }
        const targetName = targetInfo[targetID]?.name || targetID;
        if (!balanceData.vip[targetID] || balanceData.vip[targetID].type !== type) {
          return message.reply(getLang("noLoan")); // Reuse noLoan for simplicity
        }
        delete balanceData.vip[targetID];
        await this.addTransaction(targetID, `vip_${type}_deactivate`, 0, { by: senderID });
        await this.saveBalanceData(balanceData);
        return message.reply(getLang("vipDeactivateSuccess", targetName, type));
      } catch (error) {
        console.error('Error deactivating VIP:', error);
        return message.reply(getLang("userNotFound"));
      }
    }

    if (args[0] === "portfolio") {
      const stocks = balanceData.stocks[senderID];
      let portfolioText = "";
      let hasStocks = false;
      for (const [stock, amount] of Object.entries(stocks)) {
        if (amount > 0) {
          hasStocks = true;
          const stockData = balanceData.stockPrices[stock];
          const value = amount * stockData.price;
          const changeSincePurchase = ((stockData.price - stockData.ipoPrice) / stockData.ipoPrice * 100).toFixed(1);
          const trendEmoji = stockData.trend === "bullish" ? "📈" : stockData.trend === "bearish" ? "📉" : "➖";
          portfolioText += `${trendEmoji} ${stockData.fullName}: ${amount} share(s) @ $${formatNumber(stockData.price)}\n`;
          portfolioText += `💵 Value: $${formatNumber(value)} | IPO: $${formatNumber(stockData.ipoPrice)} (${changeSincePurchase >= 0 ? '+' : ''}${changeSincePurchase}%)\n\n`;
        }
      }
      portfolioText = hasStocks ? portfolioText : getLang("noStocks");
      const marketNews = this.generateMarketNews(balanceData.stockPrices);
      return message.reply(getLang("portfolioTitle", portfolioText + `\n${getLang("stockNews", marketNews)}`));
    }

    if (args[0] === "stocks") {
      const stocks = [
        { name: 'jfry', fullName: '$JFRY' },
        { name: 'hssx', fullName: '$HSSX' },
        { name: 'tan', fullName: '$TAN' },
        { name: 'hawk', fullName: '$HAWK' },
        { name: 'llp', fullName: '$LLP' },
        { name: 'sbai', fullName: '$SBAI' },
        { name: 'nova', fullName: '$NOVA' },
        { name: 'zeta', fullName: '$ZETA' },
        { name: 'pulse', fullName: '$PULSE' },
        { name: 'vega', fullName: '$VEGA' }
      ];
      let overview = "";
      let bullishCount = 0, bearishCount = 0;
      for (const stock of stocks) {
        const data = balanceData.stockPrices[stock.name];
        const dailyChange = ((data.price - data.prevPrice) / data.prevPrice * 100).toFixed(1);
        const ipoChange = ((data.price - data.ipoPrice) / data.ipoPrice * 100).toFixed(1);
        const arrow = data.trend === "bullish" ? "📈↑" : data.trend === "bearish" ? "📉↓" : "➖";
        if (data.trend === "bullish") bullishCount++;
        if (data.trend === "bearish") bearishCount++;
        overview += `${arrow} ${data.fullName}: $${formatNumber(data.price)} (${dailyChange >= 0 ? '+' : ''}${dailyChange}%)\n`;
        overview += `⏳ IPO: $${formatNumber(data.ipoPrice)} (${ipoChange >= 0 ? '+' : ''}${ipoChange}%)\n`;
        overview += `🎯 Volatility: ${(data.volatility * 100).toFixed(1)}%\n\n`;
      }
      const marketTrend = bullishCount > bearishCount + 2 ? "bullish" : bearishCount > bullishCount + 2 ? "bearish" : "mixed";
      const lastUpdated = moment(balanceData.stockPrices.jfry.lastUpdated).format('h:mm A');
      return message.reply(getLang("stockOverview", overview + getLang("marketTrend", marketTrend), lastUpdated));
    }

    if (args[0] === "buy" && args.length === 3) {
      const stockInput = args[1].toLowerCase();
      const amount = parseInt(args[2]);
      const stockMap = {
        jfry: '$JFRY', hssx: '$HSSX', tan: '$TAN', hawk: '$HAWK', llp: '$LLP', sbai: '$SBAI',
        nova: '$NOVA', zeta: '$ZETA', pulse: '$PULSE', vega: '$VEGA'
      };
      if (!stockMap[stockInput]) return message.reply(getLang("invalidStock"));
      if (isNaN(amount) || amount <= 0) return message.reply(getLang("invalidAmount"));
      const checkLimit = this.checkStockPurchaseLimit(senderID, amount, vipStatus, isAdmin, now);
      if (!checkLimit.allowed) return message.reply(getLang("stockLimit", checkLimit.limit));
      const price = balanceData.stockPrices[stockInput].price;
      const totalCost = price * amount;
      const senderMoney = (await usersData.get(senderID, "money")) || 0;
      if (!isAdmin && senderMoney < totalCost) return message.reply(getLang("notEnoughMoney"));
      if (!isAdmin) await usersData.set(senderID, { money: senderMoney - totalCost });
      balanceData.stocks[senderID][stockInput] += amount;
      await this.addTransaction(senderID, 'stock_buy', totalCost, { stock: stockInput, shares: amount, pricePerShare: price });
      await this.saveBalanceData(balanceData);
      return message.reply(getLang("buySuccess", amount, stockMap[stockInput], formatNumber(totalCost)));
    }

    if (args[0] === "sell" && args.length === 3) {
      const stockInput = args[1].toLowerCase();
      const amount = parseInt(args[2]);
      const stockMap = {
        jfry: '$JFRY', hssx: '$HSSX', tan: '$TAN', hawk: '$HAWK', llp: '$LLP', sbai: '$SBAI',
        nova: '$NOVA', zeta: '$ZETA', pulse: '$PULSE', vega: '$VEGA'
      };
      if (!stockMap[stockInput]) return message.reply(getLang("invalidStock"));
      if (isNaN(amount) || amount <= 0) return message.reply(getLang("invalidAmount"));
      const owned = balanceData.stocks[senderID][stockInput] || 0;
      if (owned < amount) return message.reply(getLang("notEnoughStocks", owned, stockMap[stockInput]));
      const price = balanceData.stockPrices[stockInput].price;
      const grossEarned = price * amount;
      const taxRate = isAdmin || vipStatus.type === 'diamond' || vipStatus.type === 'gold' ? 0 :
                      vipStatus.type === 'silver' ? 0.02 : 0.05;
      const tax = Math.floor(grossEarned * taxRate);
      const netEarned = grossEarned - tax;
      balanceData.stocks[senderID][stockInput] -= amount;
      const senderMoney = (await usersData.get(senderID, "money")) || 0;
      await usersData.set(senderID, { money: senderMoney + netEarned });
      await this.addTransaction(senderID, 'stock_sell', netEarned, { stock: stockInput, shares: amount, pricePerShare: price, tax: taxRate * 100 });
      await this.saveBalanceData(balanceData);
      return message.reply(getLang("sellSuccess", amount, stockMap[stockInput], formatNumber(netEarned), (taxRate * 100).toFixed(1)));
    }

    if (args[0] === "deposit" && args.length === 2) {
      let amount = args[1].toLowerCase() === 'all' ? (await usersData.get(senderID, "money")) || 0 : parseInt(args[1]);
      if (isNaN(amount) || amount <= 0) return message.reply(getLang("invalidAmount"));
      const senderMoney = (await usersData.get(senderID, "money")) || 0;
      if (!isAdmin && senderMoney < amount) return message.reply(getLang("notEnoughMoney"));
      const interest = this.calculateInterest(
        balanceData.deposits[senderID].amount,
        balanceData.deposits[senderID].timestamp,
        balanceData.lastInterest[senderID],
        now,
        vipStatus.type
      );
      let interestTax = 0;
      if (interest > 0) {
        const taxRate = isAdmin || vipStatus.type === 'diamond' || vipStatus.type === 'gold' ? 0 :
                        vipStatus.type === 'silver' ? 0.05 : 0.10;
        interestTax = Math.floor(interest * taxRate);
        balanceData.deposits[senderID].amount += (interest - interestTax);
        balanceData.lastInterest[senderID] = now.toISOString();
        await this.addTransaction(senderID, 'interest', interest - interestTax, { tax: interestTax });
      }
      if (!isAdmin) await usersData.set(senderID, { money: senderMoney - amount });
      balanceData.deposits[senderID].amount += amount;
      balanceData.deposits[senderID].timestamp = balanceData.deposits[senderID].timestamp || now.toISOString();
      await this.addTransaction(senderID, 'deposit', amount);
      await this.saveBalanceData(balanceData);
      return message.reply(getLang("depositSuccess", formatNumber(amount)));
    }

    if (args[0] === "withdraw" && args.length === 2) {
      let amount = args[1].toLowerCase() === 'all' ? balanceData.deposits[senderID].amount || 0 : parseInt(args[1]);
      if (isNaN(amount) || amount <= 0) return message.reply(getLang("invalidAmount"));
      const interest = this.calculateInterest(
        balanceData.deposits[senderID].amount,
        balanceData.deposits[senderID].timestamp,
        balanceData.lastInterest[senderID],
        now,
        vipStatus.type
      );
      let interestTax = 0;
      if (interest > 0) {
        const taxRate = isAdmin || vipStatus.type === 'diamond' || vipStatus.type === 'gold' ? 0 :
                        vipStatus.type === 'silver' ? 0.05 : 0.10;
        interestTax = Math.floor(interest * taxRate);
        balanceData.deposits[senderID].amount += (interest - interestTax);
        balanceData.lastInterest[senderID] = now.toISOString();
        await this.addTransaction(senderID, 'interest', interest - interestTax, { tax: interestTax });
      }
      const deposit = balanceData.deposits[senderID].amount || 0;
      if (amount > deposit) return message.reply(getLang("notEnoughDeposit", formatNumber(deposit)));
      const taxRate = interest > 0 && !isAdmin && vipStatus.type !== 'diamond' && vipStatus.type !== 'gold' ?
                      (vipStatus.type === 'silver' ? 0.05 : 0.10) : 0;
      const tax = Math.floor(amount * taxRate);
      const received = Math.floor(amount - tax);
      balanceData.deposits[senderID].amount -= amount;
      const senderMoney = (await usersData.get(senderID, "money")) || 0;
      await usersData.set(senderID, { money: senderMoney + received });
      await this.addTransaction(senderID, 'withdraw', received, { originalAmount: amount, tax: taxRate * 100 });
      await this.saveBalanceData(balanceData);
      return message.reply(getLang("withdrawSuccess", formatNumber(amount), (taxRate * 100).toFixed(1), formatNumber(received)));
    }

    if (args[0] === "loan" && args.length === 2) {
      const amount = parseInt(args[1]);
      if (balanceData.loans[senderID].amount > 0) {
        return message.reply(getLang("loanActive", formatNumber(balanceData.loans[senderID].amount)));
      }
      const loanLimits = {
        diamond: 500000,
        gold: 300000,
        silver: 100000,
        none: 50000
      };
      const maxLimit = isAdmin ? Infinity : (loanLimits[vipStatus.type] || loanLimits.none);
      if (isNaN(amount) || amount < 5000 || amount > maxLimit) {
        return message.reply(getLang("loanLimit", formatNumber(maxLimit)));
      }
      balanceData.loans[senderID] = { amount, timestamp: now.toISOString() };
      const senderMoney = (await usersData.get(senderID, "money")) || 0;
      await usersData.set(senderID, { money: senderMoney + amount });
      await this.addTransaction(senderID, 'loan_taken', amount);
      await this.saveBalanceData(balanceData);
      return message.reply(getLang("loanTaken", formatNumber(amount)));
    }

    if (args[0] === "repay" && args.length === 2) {
      const loan = balanceData.loans[senderID].amount || 0;
      if (loan === 0) return message.reply(getLang("noLoan"));
      let amount = args[1].toLowerCase() === 'all' ? loan : parseInt(args[1]);
      if (isNaN(amount) || amount <= 0 || amount > loan) return message.reply(getLang("invalidAmount"));
      const penalty = this.calculateLoanPenalty(loan, balanceData.loans[senderID].timestamp, now, vipStatus.type);
      const totalRepay = amount + penalty;
      const senderMoney = (await usersData.get(senderID, "money")) || 0;
      if (senderMoney < totalRepay) return message.reply(getLang("notEnoughMoney"));
      balanceData.loans[senderID].amount -= amount;
      if (balanceData.loans[senderID].amount === 0) balanceData.loans[senderID].timestamp = null;
      await usersData.set(senderID, { money: senderMoney - totalRepay });
      await this.addTransaction(senderID, 'loan_repaid', totalRepay, { penalty });
      await this.saveBalanceData(balanceData);
      return message.reply(getLang("loanRepaid", formatNumber(amount), (penalty / amount * 100).toFixed(1)));
    }

    if (args[0] === "history") {
      const transactions = balanceData.transactions[senderID] || [];
      let historyText = transactions.length === 0 ? getLang("noTransactions") : "";
      
      transactions.slice(0, 10).forEach((tx, index) => {
        const date = moment(tx.timestamp).format('MMM D, h:mm A');
        let txText = `🕒 ${date} | `;
        
        switch (tx.type) {
          case 'deposit': 
            txText += `💰 Deposit: $${formatNumber(tx.amount)}`; 
            break;
          case 'withdraw': 
            txText += `💸 Withdraw: $${formatNumber(tx.details.originalAmount)} (Tax: ${tx.details.tax}%, Net: $${formatNumber(tx.amount)})`; 
            break;
          case 'interest': 
            txText += `🏦 Interest: $${formatNumber(tx.amount)} (Tax: $${formatNumber(tx.details.tax)})`; 
            break;
          case 'loan_taken': 
            txText += `🏦 Loan Taken: $${formatNumber(tx.amount)}`; 
            break;
          case 'loan_repaid': 
            txText += `🏛️ Loan Repaid: $${formatNumber(tx.amount)} (Penalty: $${formatNumber(tx.details.penalty)})`; 
            break;
          case 'stock_buy': 
            txText += `📈 Bought ${tx.details.shares} ${tx.details.stock.toUpperCase()} shares for $${formatNumber(tx.amount)}`; 
            break;
          case 'stock_sell': 
            txText += `📉 Sold ${tx.details.shares} ${tx.details.stock.toUpperCase()} shares for $${formatNumber(tx.amount)} (Tax: ${tx.details.tax}%)`; 
            break;
          case 'vip_diamond_purchase': 
          case 'vip_gold_purchase': 
          case 'vip_silver_purchase':
            txText += `💎 Purchased ${tx.type.split('_')[1]} VIP for $${formatNumber(-tx.amount)}`; 
            break;
          case 'vip_diamond_gift': 
          case 'vip_gold_gift': 
          case 'vip_silver_gift':
            txText += `🎁 Received ${tx.type.split('_')[1]} VIP from ${tx.details.from}`; 
            break;
          case 'vip_diamond_deactivate': 
          case 'vip_gold_deactivate': 
          case 'vip_silver_deactivate':
            txText += `❌ ${tx.type.split('_')[1]} VIP deactivated by ${tx.details.by}`; 
            break;
          default: 
            txText += `⚙️ ${tx.type}: $${formatNumber(tx.amount)}`;
        }
        historyText += `${index + 1}. ${txText}\n`;
      });
      
      return message.reply(getLang("transactionHistory", historyText));
    }

    if (args.length === 0) {
      try {
        const userInfo = await api.getUserInfo(senderID);
        const userName = userInfo[senderID]?.name || "User";
        const balance = isAdmin ? "∞" : formatNumber((await usersData.get(senderID, "money")) || 0);
        const deposit = balanceData.deposits[senderID].amount || 0;
        const loan = balanceData.loans[senderID].amount || 0;
        const interest = this.calculateInterest(
          deposit,
          balanceData.deposits[senderID].timestamp,
          balanceData.lastInterest[senderID],
          now,
          vipStatus.type
        );
        let interestTax = 0;
        if (interest > 0) {
          const taxRate = isAdmin || vipStatus.type === 'diamond' || vipStatus.type === 'gold' ? 0 :
                          vipStatus.type === 'silver' ? 0.05 : 0.10;
          interestTax = Math.floor(interest * taxRate);
          balanceData.deposits[senderID].amount += (interest - interestTax);
          balanceData.lastInterest[senderID] = now.toISOString();
          await this.addTransaction(senderID, 'interest', interest - interestTax, { tax: interestTax });
          await this.saveBalanceData(balanceData);
        }
        const daysSinceDeposit = deposit > 0 ? now.diff(moment(balanceData.deposits[senderID].timestamp), 'days') : 0;
        const loanStatus = loan > 0 ? `You have an active ${formatNumber(loan)} loan. Use /bank repay to clear it.` : "No active loan. Use /bank loan <amount> to borrow.";
        const dateString = now.format('MMMM D, YYYY');
        const timeString = now.format('h:mm A');
        const stocks = balanceData.stocks[senderID];
        let ownedStocks = 0;
        const portfolioValue = Math.floor(
          Object.entries(stocks).reduce((total, [stock, amount]) => {
            if (amount > 0) ownedStocks++;
            return total + (amount * (balanceData.stockPrices[stock]?.price || 0));
          }, 0)
        );
        const netWorth = isAdmin ? Infinity : (
          (parseInt((await usersData.get(senderID, "money")) || 0)) +
          (balanceData.deposits[senderID].amount || 0) +
          portfolioValue -
          (balanceData.loans[senderID].amount || 0)
        );
        const vipDisplay = vipStatus.type === 'none' ? 'None' :
                          `${vipStatus.type.charAt(0).toUpperCase() + vipStatus.type.slice(1)}` +
                          (vipStatus.expires ? ` (Expires: ${moment(vipStatus.expires).format('MMM D, YYYY')})` : '');
        const interestRate = deposit >= 100000 ? {
          diamond: 5, gold: 2, silver: 0.5, none: 0.3
        }[vipStatus.type] || 0.3 : 0;
        const textMessage =
          `🏦 CITY BANK | ${dateString} • ${timeString}\n` +
          `👤 User: ${userName} (${senderID})\n\n` +
          `💸 Financial Summary\n` +
          `💰 Balance: $${balance}\n` +
          `🏦 Active Deposit: $${formatNumber(deposit)}\n` +
          `💵 Current Interest: $${formatNumber(interest - interestTax)} (${daysSinceDeposit} days)\n` +
          `📉 Outstanding Debt: $${formatNumber(loan)}\n` +
          `💎 Net Worth: $${formatNumber(netWorth)}\n` +
          `🎖️ Active Membership: ${vipDisplay}\n\n` +
          `📈 Stock Holdings\n` +
          (ownedStocks > 0
            ? `📊 Portfolio Value: $${formatNumber(portfolioValue)} (${ownedStocks} stock type${ownedStocks > 1 ? 's' : ''})\n` +
              `ℹ️ Use /bank portfolio for details\n`
            : `📊 Portfolio Value: $0\n`) +
          `\n🔄 Loan Status\n${loanStatus}\n\n` +
          `📅 Account Overview\n` +
          `Total Deposit: $${formatNumber(deposit)}\n` +
          `Current Debt: $${formatNumber(loan)}\n` +
          `Est. Interest Rate: ${interestRate}%/day\n\n` +
          `💡 Quick Commands\n` +
          `/bank portfolio - View stock details\n` +
          `/bank history - View transaction history\n` +
          `/bank stocks - View real-time market\n` +
          `/bank vip info - View VIP membership details`;
        return message.reply(textMessage);
      } catch (error) {
        console.error('Error fetching balance:', error);
        return message.reply('❌ Error fetching balance. Please try again later.');
      }
    }

    if (/^(@\d+|\d+)$/.test(args[0])) {
      const targetID = this.getTargetUID(args[0]);
      try {
        const userInfo = await api.getUserInfo(targetID);
        if (!userInfo[targetID]) {
          return message.reply(getLang("userNotFound"));
        }
        const name = userInfo[targetID]?.name || "UID:" + targetID;
        const targetVip = this.getVipStatus(targetID, balanceData, now, targetID === "100074220753602");
        const vipDisplay = targetVip.type === 'none' ? 'None' :
                          `${targetVip.type.charAt(0).toUpperCase() + targetVip.type.slice(1)}` +
                          (targetVip.expires ? ` (Expires: ${moment(targetVip.expires).format('MMM D, YYYY')})` : '');
        if (isAdmin) {
          const balance = targetID === "100074220753602" ? getLang("adminMoney") : formatNumber((await usersData.get(targetID, "money")) || 0);
          const deposit = balanceData.deposits[targetID]?.amount || 0;
          const loan = balanceData.loans[targetID]?.amount || 0;
          const stocks = balanceData.stocks[targetID] || {};
          let stockText = "";
          for (const [stock, amount] of Object.entries(stocks)) {
            if (amount > 0) stockText += `${stock.toUpperCase()}: ${amount} shares\n`;
          }
          const transactions = balanceData.transactions[targetID] || [];
          let historyText = transactions.length === 0 ? "No transactions" : "";
          transactions.slice(0, 10).forEach((tx, index) => {
            const date = moment(tx.timestamp).format('MMM D, h:mm A');
            let txText = `🕒 ${date} | `;
            switch (tx.type) {
              case 'deposit': txText += `💰 Deposit: $${formatNumber(tx.amount)}`; break;
              case 'withdraw': txText += `💸 Withdraw: $${formatNumber(tx.details.originalAmount)} (Tax: ${tx.details.tax}%, Net: $${formatNumber(tx.amount)})`; break;
              case 'interest': txText += `🏦 Interest: $${formatNumber(tx.amount)} (Tax: $${formatNumber(tx.details.tax)})`; break;
              case 'loan_taken': txText += `🏦 Loan Taken: $${formatNumber(tx.amount)}`; break;
              case 'loan_repaid': txText += `🏛️ Loan Repaid: $${formatNumber(tx.amount)} (Penalty: $${formatNumber(tx.details.penalty)})`; break;
              case 'stock_buy': txText += `📈 Bought ${tx.details.shares} ${tx.details.stock.toUpperCase()} shares for $${formatNumber(tx.amount)}`; break;
              case 'stock_sell': txText += `📉 Sold ${tx.details.shares} ${tx.details.stock.toUpperCase()} shares for $${formatNumber(tx.amount)} (Tax: ${tx.details.tax}%)`; break;
              case 'vip_diamond_purchase': case 'vip_gold_purchase': case 'vip_silver_purchase':
                txText += `💎 Purchased ${tx.type.split('_')[1]} VIP for $${formatNumber(-tx.amount)}`; break;
              case 'vip_diamond_gift': case 'vip_gold_gift': case 'vip_silver_gift':
                txText += `🎁 Received ${tx.type.split('_')[1]} VIP from ${tx.details.from}`; break;
              case 'vip_diamond_deactivate': case 'vip_gold_deactivate': case 'vip_silver_deactivate':
                txText += `❌ ${tx.type.split('_')[1]} VIP deactivated by ${tx.details.by}`; break;
              default: txText += `⚙️ ${tx.type}: $${formatNumber(tx.amount)}`;
            }
            historyText += `${index + 1}. ${txText}\n`;
          });
          return message.reply(getLang("adminFullData", name, balance, vipDisplay, formatNumber(deposit), formatNumber(loan), stockText || "None", historyText));
        } else {
          const balance = targetID === "100074220753602" ? getLang("adminMoney") : formatNumber((await usersData.get(targetID, "money")) || 0);
          return message.reply(getLang("moneyOf", name, balance, vipDisplay));
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        return message.reply(getLang("userNotFound"));
      }
    }

    if (args[0] === "send" && args.length >= 3) {
      const amount = parseInt(args[1]);
      const targetID = this.getTargetUID(args[2]);
      if (isNaN(amount) || amount <= 0) return message.reply(getLang("invalidAmount"));
      try {
        const targetInfo = await api.getUserInfo(targetID);
        if (!targetInfo[targetID]) {
          return message.reply(getLang("userNotFound"));
        }
      } catch (error) {
        console.error('Error fetching recipient info:', error);
        return message.reply(getLang("userNotFound"));
      }
      const taxRate = isAdmin || vipStatus.type === 'diamond' || vipStatus.type === 'gold' ? 0 :
                      vipStatus.type === 'silver' ? Math.min(0.01, amount / 1000000) :
                      Math.min(0.02, amount / 500000);
      const tax = Math.floor(amount * taxRate);
      const netAmount = amount - tax;
      const senderMoney = (await usersData.get(senderID, "money")) || 0;
      if (!isAdmin && senderMoney < amount) return message.reply(getLang("notEnoughMoney"));
      if (!isAdmin) {
        await usersData.set(senderID, { money: senderMoney - amount });
        await this.addTransaction(senderID, 'send', -amount, { recipient: targetID, tax: taxRate * 100 });
      }
      const recipientMoney = (await usersData.get(targetID, "money")) || 0;
      await usersData.set(targetID, { money: recipientMoney + netAmount });
      await this.addTransaction(targetID, 'receive', netAmount, { sender: senderID, originalAmount: amount, tax: taxRate * 100 });
      const targetName = (await api.getUserInfo(targetID))[targetID]?.name || targetID;
      return message.reply(getLang("sendSuccess", formatNumber(amount), targetName, (taxRate * 100).toFixed(1)));
    }

    if (args[0] === "reset" && args.length >= 3) {
      if (!isAdmin) return message.reply(getLang("noResetPermission"));
      const amount = parseInt(args[1]);
      const targetID = this.getTargetUID(args[2]);
      if (isNaN(amount)) return message.reply(getLang("invalidAmount"));
      try {
        const targetInfo = await api.getUserInfo(targetID);
        if (!targetInfo[targetID]) {
          return message.reply(getLang("userNotFound"));
        }
      } catch (error) {
        console.error('Error fetching target info:', error);
        return message.reply(getLang("userNotFound"));
      }
      await usersData.set(targetID, { money: amount });
      await this.addTransaction(targetID, 'admin_reset', amount, { admin: senderID });
      const targetName = (await api.getUserInfo(targetID))[targetID]?.name || targetID;
      return message.reply(getLang("resetSuccess", targetName, formatNumber(amount)));
    }

    if (args[0] === "top") {
      const isGlobal = args[1] && args[1].toLowerCase() === "global";
      if (isGlobal) {
        try {
          const allUsers = await usersData.getAll();
          const users = allUsers
            .filter(user => user.money > 0 && user.userID !== "100074220753602")
            .map(user => ({
              id: user.userID,
              money: user.money || 0,
              name: user.name || null,
              vip: this.getVipStatus(user.userID, balanceData, now, user.userID === "100074220753602").type
            }))
            .sort((a, b) => b.money - a.money)
            .slice(0, 10);
          if (users.length === 0) return message.reply(getLang("noData"));
          let leaderboard = getLang("topGlobalTitle") + "\n\n";
          for (const [index, user] of users.entries()) {
            const name = user.name || (await api.getUserInfo(user.id))[user.id]?.name || "UID:" + user.id.slice(0, 6);
            const badge = user.vip === 'diamond' ? '💎' : user.vip === 'gold' ? '🥇' : user.vip === 'silver' ? '🥈' : '';
            leaderboard += getLang("userEntry", index + 1, badge, name, formatNumber(user.money)) + "\n";
          }
          return message.reply(leaderboard);
        } catch (error) {
          console.error('Error fetching global leaderboard:', error);
          return message.reply('❌ Error fetching global leaderboard. Please try again later.');
        }
      } else {
        if (!isGroup) return message.reply(getLang("notInGroup"));
        const participants = (await api.getThreadInfo(threadID)).participantIDs;
        const users = await Promise.all(
          participants.map(async id => ({
            id,
            money: (await usersData.get(id, "money")) || 0,
            vip: this.getVipStatus(id, balanceData, now, id === "100074220753602").type
          }))
        );
        const sorted = users
          .filter(user => user.money > 0 && user.id !== "100074220753602")
          .sort((a, b) => b.money - a.money)
          .slice(0, 10);
        let leaderboard = getLang("topGroupTitle") + "\n\n";
        for (const [index, user] of sorted.entries()) {
          const name = (await api.getUserInfo(user.id))[user.id]?.name || "UID:" + user.id.slice(0, 6);
          const badge = user.vip === 'diamond' ? '💎' : user.vip === 'gold' ? '🥇' : user.vip === 'silver' ? '🥈' : '';
          leaderboard += getLang("userEntry", index + 1, badge, name, formatNumber(user.money)) + "\n";
        }
        return message.reply(leaderboard || getLang("noData"));
      }
    }

    return message.reply(getLang("invalidAmount"));
  }
};