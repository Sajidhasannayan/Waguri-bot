const axios = require('axios');

const SEARCH_API_URL = 'https://api.duckduckgo.com/';
const ADMIN_ID = "100031021522664";
const USE_COST = 100;
const BOT_ID = "YOUR_BOT_ID_HERE"; // Replace with your bot's actual ID

module.exports = {
  config: {
    name: "search",
    aliases: ["info"],
    version: "1.0",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    description: "Search about any information (costs 100 credits)",
    category: "info",
    guide: {
      en: "{pn} <query> - Search the web\nReply with {pn} <new query> to refine"
    }
  },

  onStart: async function ({ message, args, event, usersData }) {
    try {
      const uid = event.senderID;
      const threadID = event.threadID;
      const isAdmin = uid === ADMIN_ID;

      if (!args.length || args.join('').trim() === '') {
        return message.reply("⚠️ Please provide a search query! Usage: /search <query>");
      }

      const query = args.join(' ');
      let fullQuery = query;

      // Check if this is a reply refining a previous search
      if (event.messageReply && event.messageReply.senderID === BOT_ID) {
        fullQuery = `${event.messageReply.body.split('\n\n')[1]} ${query}`; // Append to previous result
      }

      // Handle payment for non-admin users
      if (!isAdmin) {
        const userData = await usersData.get(uid);
        const balance = userData.money || 0;

        if (balance < USE_COST) {
          return message.reply(`❌ You need ${formatBalance(USE_COST)} credits to search!\nYour balance: ${formatBalance(balance)}`);
        }

        await usersData.set(uid, { money: balance - USE_COST });
        message.reply(`💸 Search Fee: -${formatBalance(USE_COST)}\nNew balance: ${formatBalance(balance - USE_COST)}\n🔍 Searching: "${query}"...`);
      } else {
        message.reply(`🔍 Admin Detected: Searching "${query}" (*✨🎩*Please wait boss*🎩✨)...`);
      }

      // Call DuckDuckGo API
      const response = await axios.get(SEARCH_API_URL, {
        params: {
          q: fullQuery,
          format: 'json',
          no_html: 1,
          skip_disambig: 1
        }
      });

      const data = response.data;
      let result = '';

      if (data.AbstractText) {
        result = data.AbstractText;
      } else if (data.Redirect) {
        result = `Redirected info: ${data.Redirect}`;
      } else if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        result = data.RelatedTopics[0].Text || "No detailed info found.";
      } else {
        result = "No results found. Try a different query!";
      }

      return message.reply(`🔍 **Search Result** 🔍\n\n${result}\n\n©️ | SAJID MOGGED • `);

    } catch (err) {
      console.error("Search Error:", {
        message: err.message,
        stack: err.stack,
        event: JSON.stringify(event),
        args: args
      });

      // Refund on error for non-admins
      if (!isAdmin) {
        const userData = await usersData.get(uid);
        await usersData.set(uid, { money: userData.money + USE_COST });
      }

      let errorMsg = "❌ Failed to search.";
      if (err.response) {
        errorMsg += `\nError: ${err.response.status} - ${err.response.data.error || 'Unknown error'}`;
      } else {
        errorMsg += `\nError: ${err.message}`;
      }
      if (!isAdmin) {
        errorMsg += `\n💰 Refunded ${formatBalance(USE_COST)} credits due to the error.`;
      }
      return message.reply(errorMsg);
    }
  },

  onChat: async function ({ message, event, usersData }) {
    try {
      const uid = event.senderID;
      const threadID = event.threadID;
      const isAdmin = uid === ADMIN_ID;

      // Check if this is a reply to a previous search result
      if (!event.messageReply || event.messageReply.senderID !== BOT_ID || !event.body.startsWith('/search')) {
        return;
      }

      const query = event.body.replace('/search', '').trim();
      if (!query) {
        return message.reply("⚠️ Please provide a new query to refine! Usage: /search <new query>");
      }

      // Handle payment for non-admin users (only if not recently charged)
      if (!isAdmin) {
        const userData = await usersData.get(uid);
        const balance = userData.money || 0;

        if (balance < USE_COST) {
          return message.reply(`❌ You need ${formatBalance(USE_COST)} credits to refine your search!\nYour balance: ${formatBalance(balance)}`);
        }

        await usersData.set(uid, { money: balance - USE_COST });
        message.reply(`💸 Refine Fee: -${formatBalance(USE_COST)}\nNew balance: ${formatBalance(balance - USE_COST)}\n🔍 Refining: "${query}"...`);
      } else {
        message.reply(`🔍 Admin Access: Refining "${query}" (free)...`);
      }

      // Call DuckDuckGo API with refined query
      const response = await axios.get(SEARCH_API_URL, {
        params: {
          q: `${event.messageReply.body.split('\n\n')[1]} ${query}`,
          format: 'json',
          no_html: 1,
          skip_disambig: 1
        }
      });

      const data = response.data;
      let result = '';

      if (data.AbstractText) {
        result = data.AbstractText;
      } else if (data.Redirect) {
        result = `Redirected info: ${data.Redirect}`;
      } else if (data.RelatedTopics && data.RelatedTopics.length > 0) {
        result = data.RelatedTopics[0].Text || "No detailed info found.";
      } else {
        result = "No results found. Try a different query!";
      }

      return message.reply(`🔍 **Refined Result** 🔍\n\n${result}\n\nReply with /search <new query> to refine further!`);

    } catch (err) {
      handleError(err, event, usersData, message);
    }
  }
};

function handleError(err, event, usersData, message) {
  console.error("Search Error:", {
    message: err.message,
    stack: err.stack,
    event: JSON.stringify(event)
  });

  const uid = event.senderID;
  const isAdmin = uid === ADMIN_ID;
  let errorMsg = "❌ Failed to process search.";

  if (err.response) {
    errorMsg += `\nError: ${err.response.status} - ${err.response.data.error || 'Unknown error'}`;
  } else {
    errorMsg += `\nError: ${err.message}`;
  }

  if (!isAdmin) {
    usersData.get(uid).then(userData => {
      usersData.set(uid, { money: userData.money + USE_COST });
      errorMsg += `\n💰 Refunded ${formatBalance(USE_COST)} credits due to the error.`;
      message.reply(errorMsg);
    });
  } else {
    message.reply(errorMsg);
  }
}

function formatBalance(amount) {
  if (amount === Infinity) return '∞';
  if (amount >= 1000000000) return (amount/1000000000).toFixed(1)+'b';
  if (amount >= 1000000) return (amount/1000000).toFixed(1)+'m';
  if (amount >= 1000) return (amount/1000).toFixed(1)+'k';
  return amount.toString();
}