const moment = require('moment-timezone');

module.exports = {
  config: {
    name: "antispam",
    version: "1.0",
    author: "SajidMogged",
    countDown: 5,
    role: 0, // Requires admin privilege to turn on/off
    shortDescription: {
      en: "Anti-spam system for group chats"
    },
    Description: {
      en: "Detects and warns users who send messages too quickly, with eventual removal after warnings"
    },
    category: "box chat",
    guide: {
      en: "{pn} on/off"
    }
  },

  onStart: async function ({ api, message, event, threadsData, args }) {
    if (args[0] !== "on" && args[0] !== "off") {
      return message.reply("🔧 Usage: antispam [on|off]\nExample: antispam on");
    }

    await threadsData.set(event.threadID, args[0] === "on", "settings.antiSpam");
    
    if (args[0] === "on") {
      if (!global.antiSpam) global.antiSpam = {};
      if (!global.antiSpam[event.threadID]) {
        global.antiSpam[event.threadID] = {
          userData: {},
          enabled: true
        };
      }
      return message.reply("✅ Anti-spam system activated\n⚠️ Users will be warned and removed if spamming");
    } else {
      if (global.antiSpam && global.antiSpam[event.threadID]) {
        delete global.antiSpam[event.threadID];
      }
      return message.reply("❌ Anti-spam system deactivated");
    }
  },

  onChat: async function ({ api, threadsData, usersData, event, message }) {
    if (event.type !== "message") return;
    
    const antiSpamEnabled = await threadsData.get(event.threadID, "settings.antiSpam");
    if (!antiSpamEnabled || !global.antiSpam || !global.antiSpam[event.threadID]) return;
    
    const threadData = global.antiSpam[event.threadID];
    const userId = event.senderID;
    const now = Date.now();
    
    // Initialize user data if not exists
    if (!threadData.userData[userId]) {
      threadData.userData[userId] = {
        count: 0,
        lastMessageTime: now,
        warnings: 0,
        lastWarningTime: 0
      };
      return;
    }
    
    const userData = threadData.userData[userId];
    
    // Reset count if more than 5 seconds passed since last message
    if (now - userData.lastMessageTime > 5000) {
      userData.count = 0;
    }
    
    userData.count++;
    userData.lastMessageTime = now;
    
    // Check spam thresholds
    if (userData.count >= 5 && userData.count < 10 && userData.warnings < 1) {
      // First warning at 5 messages
      userData.warnings = 1;
      userData.lastWarningTime = now;
      await message.reply(`⚠️ @${userId}, you're sending messages too frequently! (Warning 1/3)\nPlease slow down or you'll be removed from the chat.`, event.threadID);
    } 
    else if (userData.count >= 10 && userData.count < 15 && userData.warnings < 2) {
      // Second warning at 10 messages
      userData.warnings = 2;
      userData.lastWarningTime = now;
      await message.reply(`⚠️ @${userId}, this is your second warning for spamming! (Warning 2/3)\nSlow down immediately or face removal.`, event.threadID);
    } 
    else if (userData.count >= 15 && userData.count < 20 && userData.warnings < 3) {
      // Final warning at 15 messages
      userData.warnings = 3;
      userData.lastWarningTime = now;
      await message.reply(`⚠️ @${userId}, FINAL WARNING! (Warning 3/3)\nOne more spam and you'll be removed from this group.`, event.threadID);
    } 
    else if (userData.count >= 20) {
      // Kick user at 20 messages
      try {
        await api.removeUserFromGroup(userId, event.threadID);
        await message.reply(`🚫 @${userId} has been removed for excessive spamming.`, event.threadID);
        // Reset their data
        threadData.userData[userId] = {
          count: 0,
          lastMessageTime: now,
          warnings: 0,
          lastWarningTime: 0
        };
      } catch (e) {
        console.error("Failed to remove user:", e);
        await message.reply(`⚠️ Failed to remove spammer. The bot might need admin privileges.`);
      }
    }
  }
};