module.exports = {
    config: {
        name: "leave",
        version: "1.1",
        author: "SajidMogged",
        countDown: 5,
        role: 2,
        description: {
            vi: "Chỉ admin của bot có thể sử dụng lệnh này để rời nhóm hiện tại hoặc nhóm chỉ định",
            en: "Only the bot admin can use this command to leave current or specified group"
        },
        category: "owner",
        guide: {
            vi: "{pn} [threadID] - Nếu không có threadID, bot sẽ rời nhóm hiện tại",
            en: "{pn} [threadID] - If no threadID is provided, bot will leave current group"
        }
    },

    onStart: async function ({ message, event, args, api }) {
        try {
            const { threadID, senderID } = event;

            // Only your admin ID is allowed
            const botAdmins = ["100031021522664"]; // Your ID

            if (!botAdmins.includes(senderID)) {
                return message.reply("❌ Only the bot's admin can use this command!");
            }

            let targetThreadID = threadID; // Default to current thread
            
            // If a thread ID is provided as argument
            if (args[0]) {
                if (!/^\d+$/.test(args[0])) {
                    return message.reply("❌ Invalid thread ID format. Please provide a numeric thread ID.");
                }
                targetThreadID = args[0];
            }

            // Send farewell message and leave
            await message.reply(`✅ LEAVING CHAT (ID: ${targetThreadID}) now...`);
            api.removeUserFromGroup(api.getCurrentUserID(), targetThreadID);

        } catch (error) {
            console.error("Error in leave command:", error);
            message.reply("⚠️ An error occurred while trying to leave the chat.");
        }
    }
};