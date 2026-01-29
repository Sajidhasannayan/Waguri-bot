const axios = require('axios');
const fs = require('fs');
const path = require('path');

// File path for storing approved users
const APPROVAL_FILE = path.join(__dirname, 'image_approval.json');

// Load approved users from file or create new file
let approvedUsers = [];
try {
  if (fs.existsSync(APPROVAL_FILE)) {
    approvedUsers = JSON.parse(fs.readFileSync(APPROVAL_FILE));
  } else {
    fs.writeFileSync(APPROVAL_FILE, JSON.stringify(["100031021522664"])); // Add admin as default
    approvedUsers = ["100031021522664"];
  }
} catch (err) {
  console.error("Error loading approval file:", err);
  approvedUsers = ["100031021522664"]; // Fallback with admin UID
}

module.exports = {
  config: {
    name: "xt",
    version: "2.0",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Advanced AI image generation (Approval Required)"
    },
    longDescription: {
      en: "Generate high-quality images using FluxWebUI (Admin approval needed)"
    },
    category: "image",
    guide: {
      en: "{pn} [prompt] --ar [ratio]\nAvailable ratios: 1:1, 3:4, 4:3, 9:16, 16:9"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    const senderID = event.senderID.toString();
    const adminUID = "100031021522664";

    // Admin commands handler
    if (args[0] === "approve") {
      if (senderID !== adminUID) {
        return message.reply("❌ Only the bot admin can approve users!");
      }
      
      const uidToApprove = args[1];
      if (!uidToApprove) {
        return message.reply("ℹ️ Usage: /xt approve [uid]");
      }
      
      if (!approvedUsers.includes(uidToApprove)) {
        approvedUsers.push(uidToApprove);
        this.saveApprovedUsers();
        return message.reply(`✅ Approved user ${uidToApprove}\nThey can now use the /xt command.`);
      } else {
        return message.reply(`ℹ️ User ${uidToApprove} is already approved.`);
      }
    }

    if (args[0] === "remove") {
      if (senderID !== adminUID) {
        return message.reply("❌ Only the bot admin can remove users!");
      }
      
      const uidToRemove = args[1];
      if (!uidToRemove) {
        return message.reply("ℹ️ Usage: /xt remove [uid]");
      }
      
      if (uidToRemove === adminUID) {
        return message.reply("❌ You cannot remove the admin!");
      }
      
      const index = approvedUsers.indexOf(uidToRemove);
      if (index !== -1) {
        approvedUsers.splice(index, 1);
        this.saveApprovedUsers();
        return message.reply(`✅ Removed user ${uidToRemove}\nThey can no longer use the /xt command.`);
      } else {
        return message.reply(`ℹ️ User ${uidToRemove} was not in the approved list.`);
      }
    }

    if (args[0] === "list") {
      if (senderID !== adminUID) {
        return message.reply("❌ Only the bot admin can view the approved list!");
      }
      return message.reply(`📝 Approved Users:\n${approvedUsers.join('\n')}`);
    }

    // Check if user is approved
    if (!approvedUsers.includes(senderID)) {
      return message.reply("❌ You don't have permission to use this command!\nAsk admin to grant access");   
    }

    // Image generation logic
    if (args.length === 0) {
      return message.reply("ℹ️ Usage: /xt [prompt] --ar [ratio]\nExample: /xt a beautiful girl --ar 16:9");
    }

    // Default values
    let ratio = "1:1";
    let promptParts = args;
    const validRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];

    // Check for --ar parameter
    const arIndex = args.lastIndexOf("--ar");
    if (arIndex !== -1 && arIndex === args.length - 2) {
      const requestedRatio = args[arIndex + 1];
      if (validRatios.includes(requestedRatio)) {
        ratio = requestedRatio;
        promptParts = args.slice(0, arIndex);
      }
    }

    const prompt = promptParts.join(" ");

    // React with ⏳ while generating
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      // API request
      const apiUrl = `https://kaiz-apis.gleeze.com/api/fluxwebui?prompt=${encodeURIComponent(prompt)}&ratio=${ratio}&apikey=828c7c9b-3017-4647-b757-22853d6c9dd5`;
      const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });

      // Save image temporarily
      const tempPath = path.join(__dirname, 'temp_xt.jpg');
      fs.writeFileSync(tempPath, Buffer.from(response.data, 'binary'));

      // Send just the image with ✅
      await message.reply({
        body: "✅ Generated",
        attachment: fs.createReadStream(tempPath)
      });

      // React with ✅ when done
      api.setMessageReaction("✅", event.messageID, () => {}, true);

      // Delete the temporary file
      fs.unlinkSync(tempPath);
    } catch (error) {
      console.error("XT Generator error:", error);
      // React with ❌ on error
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      await message.reply("❌ Failed to generate image. Please try again later.");
    }
  },

  saveApprovedUsers: function() {
    try {
      fs.writeFileSync(APPROVAL_FILE, JSON.stringify(approvedUsers, null, 2));
    } catch (err) {
      console.error("Error saving approved users:", err);
    }
  }
};