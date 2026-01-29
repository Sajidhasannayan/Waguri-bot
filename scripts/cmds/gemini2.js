const axios = require('axios');
const FormData = require('form-data');
const { createReadStream } = require('fs');
const { writeFileSync } = require('fs');
const { getStreamFromURL } = global.utils;

const activeUsers = new Map(); // userId -> lastBotMsgID

const GEMINI_API_KEY = 'AIzaSyBCKkrdcQglIKJkWrxuKQuEC9sq-ehluvc';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

module.exports = {
  config: {
    name: "gemini2",
    version: "1.0",
    author: "SajidMogged",
    countDown: 3,
    role: 0,
    description: {
    en: "Chat with Gemini 2.0 (flash)"
    },
    category: "ai",
    guide: {
      en: "{pn} <message> - Start Gemini 2 chat\nReply to continue\nReply to image: {pn} [message]\n{pn} reset - Reset session"
    }
  },

  onStart: async function ({ event, message, args, api }) {
    const userId = event.senderID;
    let prompt = args.join(" ").trim();
    let imageBuffer = null;

    if (!prompt && !(event.messageReply?.attachments?.length > 0)) {
      return message.reply("Please provide a message or reply to an image.");
    }

    if (prompt.toLowerCase() === "reset") {
      activeUsers.delete(userId);
      return message.reply("Gemini 2 session has been reset.");
    }

    // Image support
    if (event.messageReply?.attachments?.length > 0) {
      const attachment = event.messageReply.attachments[0];
      if (attachment.type === 'photo' || attachment.type === 'animated_image') {
        imageBuffer = await getStreamFromURL(attachment.url);
        if (!prompt) prompt = "Describe this image.";
      }
    }

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getGemini2Response(prompt, userId, imageBuffer);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Gemini 2 didn’t respond.");
    }

    const reply = await message.reply(response);
    if (reply?.messageID) {
      activeUsers.set(userId, reply.messageID);
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    }
  },

  onChat: async function ({ event, message, api }) {
    const userId = event.senderID;
    const lastBotMsgId = activeUsers.get(userId);
    if (!lastBotMsgId || event.messageReply?.messageID !== lastBotMsgId) return;

    const prompt = event.body.trim();
    if (!prompt) return;

    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    const response = await this.getGemini2Response(prompt, userId);
    if (!response) {
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      return message.reply("Gemini 2 didn’t respond.");
    }

    const reply = await message.reply(response);
    if (reply?.messageID) {
      activeUsers.set(userId, reply.messageID);
      api.setMessageReaction("✅", event.messageID, () => {}, true);
    }
  },

  getGemini2Response: async function (prompt, uid, imageBuffer = null) {
    try {
      const payload = {
        contents: [
          {
            role: "user",
            parts: imageBuffer
              ? [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: "image/jpeg",
                      data: (await this.bufferToBase64(imageBuffer)).toString()
                    }
                  }
                ]
              : [{ text: prompt }]
          }
        ]
      };

      const { data } = await axios.post(GEMINI_API_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 20000
      });

      return data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("\n") || null;
    } catch (err) {
      console.error("Gemini2 error:", err?.response?.data || err);
      return null;
    }
  },

  bufferToBase64: async function (stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('base64');
  }
};