const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "4gen",
    version: "1.1", // Updated version
    author: "SajidMogged",
    countDown: 15,
    role: 0,
    shortDescription: {
      en: "Generate images with AI"
    },
    Description: {
      en: "Generate high-quality images using AI with different aspect ratios"
    },
    category: "image",
    guide: {
      en: "{pn} [prompt] [ratio]\nAvailable ratios: 1:1, 3:4, 4:3, 9:16, 16:9"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    try {
      // Check if prompt is provided
      if (args.length === 0) {
        return message.reply("ℹ️ Please provide a prompt. Usage:\n/4gen [prompt] [ratio]\nExample: /4gen a beautiful sunset 16:9");
      }

      // Default ratio is 1:1
      let ratio = "1:1";
      const validRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];

      // Check if last argument is a valid ratio
      const lastArg = args[args.length - 1];
      if (validRatios.includes(lastArg)) {
        ratio = lastArg;
        args.pop(); // Remove ratio from prompt
      }

      const prompt = args.join(" ");
      const API_KEY = process.env.KAIZ_API_KEY; // Get API key from Replit Secrets

      if (!API_KEY) {
        return message.reply("❌ Image generation service is currently unavailable. (Missing API key)");
      }

      // React with ⏳ while generating
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      // API request with API key
      const apiUrl = `https://kaiz-apis.gleeze.com/api/4gen?prompt=${encodeURIComponent(prompt)}&ratio=${ratio}&stream=true&apikey=${API_KEY}`;
      const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

      // Save image temporarily
      const tempPath = path.join(__dirname, 'temp_4gen.jpg');
      fs.writeFileSync(tempPath, Buffer.from(response.data, 'binary'));

      // Send the generated image
      await message.reply({
        body: `✅ Generated Image\n📝 Prompt: "${prompt}"\n📐 Ratio: ${ratio}`,
        attachment: fs.createReadStream(tempPath)
      });

      // React with ✅ when done
      api.setMessageReaction("✅", event.messageID, () => {}, true);

      // Delete the temporary file
      fs.unlinkSync(tempPath);
    } catch (error) {
      console.error("4gen error:", error);
      // React with ❌ on error
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      await message.reply("❌ Failed to generate image. Please try again later.");
    }
  }
};