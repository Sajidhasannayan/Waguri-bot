const moment = require('moment-timezone');

const BAD_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "ass",
  "dick",
  "pussy",
  "bastard",
  "motherfucker",
  "fucker",
  "cunt",
  "whore",
  "molest",
  "chod",
  "khanki",
  "magi",
  "bessa",
  "bessha",
  "madarcod",
  "madarchod",
  "behenchod",
  "baincod",
  "bancod",
  "bainchod",
  "slut",
  "cock",
  "sucker",
  "stfu",
  "chudi",
  "chudlam",
  "chudbo",
  "cudi",
  "putki",
  "hoga",
  "paca",
  "pacha",
  "pasa",
  "guwa",
  "goa",
  "gua",
  "thapabo",
  "thapa",
  "mal",
  "kutta",
  "suor",
  "shour",
  "suwor",
  "shuor",
  "shuwor",
  "rape",
  "childporn",
  "bum",
  "butt",
  "bokacoda",
  "bkacda",
  "bokachoda",
  "bokcod",
  "bkcd",
  "bokchod",
  "bhudai",
  "marbo",
  "bhoda",
  "boda",
  "bodai",
  "nosu",
  "nola",
  "atel",
  "achoda",
  "achuda",
  "acoda",
  "tukai",
  "tokai",
  "nigga",
  "nigger",
  "genocide",
  "dhorson",
  "bal",
  "noti",
  "abal",
  "mage",
  "magee",
  "kanki",
  "khanke",
  "khankee",
  "kanke",
  "dhon",
  "dhoner",
  "mara",
  "cum",
  "prostitute",
  "dickless",
  "madrcd",
  "jaura",
  "jawra",
  "jaora",
  "kukur",
  "impotent",
  "heda",
  "chudirbhai",
  "rendir",
  "randi",
  "bhuski",
  "cunt",
  "poop",
  "hagu",
  "gu",
  "haga",
  "mut",
  "nut",
  "creampie",
  "creamed",
  "molester",
  "fucked",
  "fucking",
  "choda",
  "sex",
  "sexybitch"
  
];

// turns "ass" → "a$$", "fuck" → "f*ck"
function censorWord(word) {
  if (word.length <= 2) return "*".repeat(word.length);
  const middle = word
    .slice(1, -1)
    .replace(/[a-z]/gi, match => {
      const map = { a: "@", s: "$", i: "!", o: "0", e: "*", u: "µ" };
      return map[match.toLowerCase()] || "*";
    });
  return word[0] + middle + word[word.length - 1];
}

function censorText(text) {
  let result = text;
  for (const bad of BAD_WORDS) {
    const regex = new RegExp(`\\b${bad}\\b`, "gi");
    result = result.replace(regex, match => censorWord(match));
  }
  return result;
}

module.exports = {
  config: {
    name: "resend",
    version: "2.2",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Anti-unsend system with attachments"
    },
    Description: {
      en: "Tracks and resends unsent messages with media attachments"
    },
    category: "box chat",
    guide: {
      en: "{pn} on/off"
    }
  },

  onStart: async function ({ api, message, event, threadsData, args }) {
    if (args[0] !== "on" && args[0] !== "off") {
      return message.reply("🔧 Usage: resend [on|off]\nExample: resend on");
    }

    await threadsData.set(event.threadID, args[0] === "on", "settings.reSend");
    
    if (args[0] === "on") {
      if (!global.reSend) global.reSend = {};
      if (!global.reSend[event.threadID]) {
        global.reSend[event.threadID] = [];
      }
      try {
        const history = await api.getThreadHistory(event.threadID, 100, undefined);
        global.reSend[event.threadID] = history.filter(msg => msg);
      } catch (error) {
        console.error("Error fetching thread history:", error);
      }
      return message.reply("✅ Anti-unsend system activated\n🔰 Now tracking messages in this thread");
    } else {
      if (global.reSend && global.reSend[event.threadID]) {
        delete global.reSend[event.threadID];
      }
      return message.reply("❌ Anti-unsend system deactivated");
    }
  },

  onChat: async function ({ api, threadsData, usersData, event, message }) {
    if (event.type === "message") {
      const resendEnabled = await threadsData.get(event.threadID, "settings.reSend");
      if (!resendEnabled) return;
      
      if (!global.reSend) global.reSend = {};
      if (!global.reSend[event.threadID]) {
        global.reSend[event.threadID] = [];
      }
      
      global.reSend[event.threadID].push(event);
      
      if (global.reSend[event.threadID].length > 100) {
        global.reSend[event.threadID].shift();
      }
    }
    
    if (event.type === "message_unsend") {
      const resendEnabled = await threadsData.get(event.threadID, "settings.reSend");
      if (!resendEnabled || !global.reSend || !global.reSend[event.threadID]) return;
      
      const unsentMsg = global.reSend[event.threadID].find(msg => msg.messageID === event.messageID);
      if (!unsentMsg) return;
      
      const senderInfo = await usersData.get(unsentMsg.senderID);
      const senderName = senderInfo ? senderInfo.name : "Unknown User";
      const dhakaTime = moment().tz('Asia/Dhaka').format('YYYY-MM-DD HH:mm:ss');
      
      let resendMessage = `╭─── 𝗨𝗡𝗦𝗘𝗡𝗧 𝗠𝗘𝗦𝗦𝗔𝗚𝗘 ───⭑\n`;
      resendMessage += `│ 𝗨𝘀𝗲𝗿: ${senderName}\n`;
      resendMessage += `│ 𝗨𝗜𝗗: ${unsentMsg.senderID}\n`;
      resendMessage += `│ 𝗧𝗶𝗺𝗲: ${dhakaTime} (GMT+6)\n`;
      resendMessage += `╰───────────────────⭑\n\n`;
      
      if (unsentMsg.body) {
  const safeText = censorText(unsentMsg.body);
  resendMessage += `${safeText}\n\n`;
      }

      try {
  if (unsentMsg.attachments && unsentMsg.attachments.length > 0) {
    const attachmentStreams = [];

    for (const attachment of unsentMsg.attachments) {
      try {
        // Force audio/video stream handling by using correct headers
        const stream = await global.utils.getStreamFromURL(attachment.url, {
          headers: {
            'Range': 'bytes=0-', // Required for audio/video
            'User-Agent': 'Mozilla/5.0'
          }
        });

        stream.path = `${Date.now()}_${attachment.filename || attachment.type}`;
        attachmentStreams.push(stream);
      } catch (err) {
        console.error(`❌ Failed to get attachment: ${attachment.url}`, err);
      }
    }

    if (attachmentStreams.length > 0) {
      await message.reply({
        body: resendMessage,
        attachment: attachmentStreams
      });
    } else {
      await message.reply(resendMessage + "\n⚠️ Attachments couldn't be restored (possibly expired).");
    }
  } else {
    await message.reply(resendMessage);
  }
} catch (e) {
  console.error("Resend Error:", e);
  await message.reply("⚠️ Error resending message. The content may have expired.");
      }
    }
  }
};
