const fs = require('fs-extra');
const path = require('path');
const { getStreamFromURL, getExtFromUrl, getTime } = global.utils;

// JSON file path
const storagePath = path.join(__dirname, 'data', 'setwelcome.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(storagePath)))
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });

// Initialize file if missing
if (!fs.existsSync(storagePath))
  fs.writeFileSync(storagePath, JSON.stringify({}), 'utf8');

async function getData() {
  return fs.readJson(storagePath).catch(() => ({}));
}
async function saveData(data) {
  await fs.writeJson(storagePath, data, { spaces: 2 });
}

module.exports = {
  config: {
    name: "setwelcome",
    aliases: ["setwc"],
    version: "2.0",
    author: "SajidMogged",
    countDown: 5,
    role: 1,
    description: {
      en: "Edit welcome message and attachment when a new member joins your group"
    },
    category: "custom",
    guide: {
  en: {
    body:
      "   {pn} on: Turn on welcome message\n" +
      "   {pn} off: Turn off welcome message\n" +
      "   {pn} text [<content> | reset]: edit text content or reset to default\n" +
      "   {pn} file [<url> | reset]: set or reset welcome attachment\n\n" +
      "Available shortcuts:\n" +
      "  + {userName}: new member name\n" +
      "  + {userNameTag}: new member name (tag)\n" +
      "  + {boxName}: group chat name\n" +
      "  + {multiple}: you || you guys\n" +
      "  + {session}: session in day\n\n" +
      "Example:\n" +
      "   {pn} text Hello {userName}, welcome to {boxName}, have a nice day {multiple}",
    attachment: {
      [path.join(__dirname, 'assets', 'guide', 'setwelcome', 'setwelcome.png')]: true
    }
  }
    }
  },

  langs: {
    en: {
      turnedOn: "Turned on welcome message",
      turnedOff: "Turned off welcome message",
      missingContent: "Please enter welcome message content",
      edited: "Edited welcome message content of your group to:\n%1",
      reseted: "Reset welcome message content",
      noFile: "No welcome attachment to reset",
      resetedFile: "Reset welcome attachment successfully",
      missingFile: "Please reply with an image or provide a URL",
      addedFile: "Added attachment to your welcome message",
      invalidUrl: "Invalid URL provided",
      dbError: "Error saving attachment"
    }
  },

  onStart: async function ({ args, threadsData, message, event, getLang }) {
    const { threadID } = event;

    switch (args[0]) {
      case "text": {
        const { data } = await threadsData.get(threadID);
        if (!args[1]) return message.reply(getLang("missingContent"));

        if (args[1] === "reset") {
          delete data.welcomeMessage;
        } else {
          data.welcomeMessage = args.slice(1).join(" ");
        }

        await threadsData.set(threadID, { data });
        return message.reply(
          data.welcomeMessage
            ? getLang("edited", data.welcomeMessage)
            : getLang("reseted")
        );
      }

      case "file": {
        if (args[1] === "reset") {
          const data = await getData();
          delete data[threadID];
          await saveData(data);
          return message.reply(getLang("resetedFile"));
        }

        let attachmentUrl;
        if (event.messageReply?.attachments?.length > 0) {
          attachmentUrl = event.messageReply.attachments[0].url;
        } else if (event.attachments?.length > 0) {
          attachmentUrl = event.attachments[0].url;
        } else if (args[1]) {
          attachmentUrl = args[1];
        } else {
          return message.reply(getLang("missingFile"));
        }

        if (!attachmentUrl.match(/^https?:\/\//))
          return message.reply(getLang("invalidUrl"));

        const type = getExtFromUrl(attachmentUrl);
        const validTypes = ["jpg", "jpeg", "png", "gif", "mp4", "mp3"];
        if (!validTypes.includes(type))
          return message.reply(getLang("invalidUrl"));

        try {
          const data = await getData();
          data[threadID] = {
            url: attachmentUrl,
            type,
            timestamp: Date.now()
          };
          await saveData(data);
          return message.reply(getLang("addedFile"));
        } catch (err) {
          console.error('Error saving attachment:', err);
          return message.reply(getLang("dbError"));
        }
      }

      case "on":
      case "off": {
        const settings = { sendWelcomeMessage: args[0] === "on" };
        await threadsData.set(threadID, { settings });
        return message.reply(getLang(args[0] === "on" ? "turnedOn" : "turnedOff"));
      }

      default:
        return message.SyntaxError();
    }
  },

  getWelcomeAttachment: async function (threadID) {
    const data = await getData();
    return data[threadID] || null;
  }
};