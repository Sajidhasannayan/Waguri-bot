const axios = require('axios');

module.exports = {
  config: {
    name: "aidetector",
    version: "1.0",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Detect AI-generated text"
    },
    longDescription: {
      en: "Analyze text to determine if it was written by AI or humans"
    },
    category: "ai",
    guide: {
      en: "{pn} <text>\nExample: {pn} There's nothing we can do"
    }
  },

  onStart: async function ({ message, args, getLang }) {
    try {
      const text = args.join(" ");
      
      if (!text) {
        return message.reply("⚠️ Please provide text to analyze. Example: /aidetector There's nothing we can do");
      }

      if (text.length < 20) {
        return message.reply("📝 Please provide longer text (at least 20 characters) for more accurate results.");
      }

      const loadingMsg = await message.reply("🔍 Analyzing text...");

      // Call the AI Detector API
      const result = await this.detectAI(text);

      // Delete loading message
      await message.unsend(loadingMsg.messageID);

      if (result) {
        const humanPercent = result.isHuman;
        const aiPercent = 100 - humanPercent;
        const feedback = result.feedback || "No additional feedback";
        const wordsAnalyzed = result.textWords || "unknown";
        const language = result.detected_language ? `(${result.detected_language.toUpperCase()})` : "";

        let responseMessage = `📊 AI Detection Results:\n\n`;
        responseMessage += `🧑 Human-written: ${humanPercent}%\n`;
        responseMessage += `🤖 AI-generated: ${aiPercent}%\n`;
        responseMessage += `📝 Words analyzed: ${wordsAnalyzed} ${language}\n\n`;
        responseMessage += `💡 Conclusion: ${feedback}\n\n`;
        
        if (result.additional_feedback) {
          responseMessage += `ℹ️ Note: ${result.additional_feedback}`;
        }

        return message.reply(responseMessage);
      } else {
        return message.reply("❌ Failed to analyze the text. Please try again later.");
      }
    } catch (error) {
      console.error("Error in aidetector command:", error);
      return message.reply("❌ An error occurred while analyzing the text. Please try again later.");
    }
  },

  detectAI: async function(text) {
    try {
      const apiUrl = `https://kaiz-apis.gleeze.com/api/aidetector?q=${encodeURIComponent(text)}&apikey=770f0df0-f042-4c9f-8e38-b25635565839`;
      
      const response = await axios.get(apiUrl);
      
      if (response.data?.response?.data) {
        return response.data.response.data;
      }
      return null;
    } catch (error) {
      console.error("Error in detectAI:", error);
      throw error;
    }
  }
};