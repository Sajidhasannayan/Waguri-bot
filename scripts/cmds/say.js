const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "say",
    version: "1.0",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    shortDescription: "Say something using voice",
    Description: {
      en: "Convert text to speech"
    },
    category: "music",
    guide: {
      en: "{pn} <text>"
    }
  },

  onStart: async function ({ args, message, event, api }) {
    const text = args.join(" ");
    if (!text) return message.reply("Please provide some text to speak.\nExample: /say hello world");

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const ttsUrl = `https://apis-rho-nine.vercel.app/tts?text=${encodeURIComponent(text)}`;
      const tempPath = path.join(__dirname, `say_${Date.now()}.mp3`);

      const response = await axios({
        url: ttsUrl,
        method: "GET",
        responseType: "stream"
      });

      const writer = fs.createWriteStream(tempPath);
      response.data.pipe(writer);

      writer.on("finish", () => {
        message.send({
          body: `✅ Speaking: "${text}"`,
          attachment: fs.createReadStream(tempPath)
        }, () => {
          fs.unlinkSync(tempPath);
          api.setMessageReaction("✅", event.messageID, () => {}, true);
        });
      });

      writer.on("error", (err) => {
        console.error(err);
        api.setMessageReaction("❌", event.messageID, () => {}, true);
        message.reply("❌ Failed to generate voice message.");
      });
    } catch (err) {
      console.error(err);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("❌ Error fetching TTS audio.");
    }
  }
};