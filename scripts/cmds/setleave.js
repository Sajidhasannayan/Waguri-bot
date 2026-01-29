const fs = require('fs-extra');
const path = require('path');
const { getStreamFromURL, getExtFromUrl, getTime } = global.utils;

// JSON storage setup
const storagePath = path.join(__dirname, 'data', 'setleave.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(storagePath))) {
  fs.mkdirSync(path.dirname(storagePath), { recursive: true });
}

// Initialize storage file if it doesn't exist
if (!fs.existsSync(storagePath)) {
  fs.writeFileSync(storagePath, JSON.stringify({}), 'utf8');
}

// Helper function to read/write JSON data
async function getData() {
  return fs.readJson(storagePath).catch(() => ({}));
}

async function saveData(data) {
  await fs.writeJson(storagePath, data, { spaces: 2 });
}

module.exports = {
  config: {
    name: "setleave",
    aliases: ["setl"],
    version: "2.2",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    description: {
      en: "Edit content/turn on/off leave message when member leaves your group chat"
    },
    category: "custom",
    guide: {
  en: {
    body:
      "   {pn} on: Turn on leave message\n" +
      "   {pn} off: Turn off leave message\n" +
      "   {pn} text [<content> | reset]: edit text content or reset to default\n" +
      "   {pn} file [<url> | reset]: set or reset leave attachment\n\n" +
      "Available shortcuts:\n" +
      "  + {userName}: name of member who left the group\n" +
      "  + {userNameTag}: name of member who left the group (tag)\n" +
      "  + {boxName}: name of group chat\n" +
      "  + {type}: left / was kicked\n" +
      "  + {session}: session in day\n\n" +
      "Example:\n" +
      "   {pn} text {userName} has {type} the group, see you again 🤧",
    attachment: {
      [path.join(__dirname, 'assets', 'guide', 'setleave', 'setleave.png')]: true
    }
  }
    }
  },

  langs: {
    en: {
      turnedOn: "Turned on leave message successfully",
      turnedOff: "Turned off leave message successfully",
      missingContent: "Please enter content",
      edited: "Edited leave message content of your group to:\n%1",
      reseted: "Reset leave message content",
      noFile: "No leave message attachment to reset",
      resetedFile: "Reset leave message attachment successfully",
      missingFile: "Please reply with an image or provide a URL",
      addedFile: "Added attachment to your leave message",
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
          delete data.leaveMessage;
        } else {
          data.leaveMessage = args.slice(1).join(" ");
        }
        
        await threadsData.set(threadID, { data });
        return message.reply(
          data.leaveMessage 
            ? getLang("edited", data.leaveMessage) 
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

        // Check attachments in priority order
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

        console.log('Detected attachment URL:', attachmentUrl);

        if (!attachmentUrl.match(/^https?:\/\//)) {
          return message.reply(getLang("invalidUrl"));
        }

        const type = getExtFromUrl(attachmentUrl);
        const validTypes = ["jpg", "jpeg", "png", "gif", "mp4", "mp3"];
        if (!validTypes.includes(type)) {
          return message.reply(getLang("invalidUrl"));
        }

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
        const settings = { sendLeaveMessage: args[0] === "on" };
        await threadsData.set(threadID, { settings });
        return message.reply(getLang(args[0] === "on" ? "turnedOn" : "turnedOff"));
      }

      default:
        return message.SyntaxError();
    }
  },

  getLeaveAttachment: async function (threadID) {
    const data = await getData();
    return data[threadID] || null;
  }
};