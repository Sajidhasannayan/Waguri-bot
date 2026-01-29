const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
  config: {
    name: "fxr",
    version: "1.2",
    author: "SajidMogged",
    countDown: 15,
    role: 0,
    shortDescription: {
      en: "Generate images with Flux Realtime AI"
    },
    Description: {
      en: "Generate high quality AI images from text prompts"
    },
    category: "image",
    guide: {
      en: "{pn} [prompt]\nExample: {pn} a beautiful sunset"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    let tempPath; // Declare tempPath at the start of the function
    
    try {
      if (args.length === 0) {
        return message.reply("ℹ️ Please provide a prompt. Usage:\n/fxr [prompt]\nExample: /fxr a beautiful sunset");
      }

      const prompt = args.join(" ");
      const API_KEY = process.env.KAIZ_API_KEY;

      if (!API_KEY) {
        return message.reply("❌ Image generation service is currently unavailable. (Missing API key)");
      }

      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      // Create temp directory if it doesn't exist
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      tempPath = path.join(tempDir, `fxr_${Date.now()}.jpg`);
      const apiUrl = `https://kaiz-apis.gleeze.com/api/flux-realtime?prompt=${encodeURIComponent(prompt)}&stream=true&apikey=${API_KEY}`;

      console.log("Making API request to:", apiUrl);

      const response = await axios({
        method: 'GET',
        url: apiUrl,
        responseType: 'stream',
        timeout: 30000
      });

      const writer = fs.createWriteStream(tempPath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Verify the image was created
      if (!fs.existsSync(tempPath) || fs.statSync(tempPath).size === 0) {
        throw new Error("Generated image file is empty");
      }

      await message.reply({
        body: `✅ Generated Image\n📝 Prompt: "${prompt}"`,
        attachment: fs.createReadStream(tempPath)
      });

      api.setMessageReaction("✅", event.messageID, () => {}, true);
    } catch (error) {
      console.error("fxr error:", error);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      
      let errorMessage = "❌ Failed to generate image. Please try again later.";
      if (error.response) {
        console.error("API Response:", error.response.data);
        errorMessage += `\n(Status: ${error.response.status})`;
      } else if (error.request) {
        console.error("No response received:", error.request);
        errorMessage += "\n(No response from API server)";
      } else {
        errorMessage += `\n(Error: ${error.message})`;
      }
      
      await message.reply(errorMessage);
    } finally {
      // Clean up temp file if it exists
      if (tempPath && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupError) {
          console.error("Error deleting temp file:", cleanupError);
        }
      }
    }
  }
};