module.exports = {
	config: {
		name: "kick",
		version: "1.3",
		author: "SajidMogged",
		countDown: 5,
		role: 1,
		description: {
			vi: "Kick thành viên khỏi box chat",
			en: "Kick member out of chat box"
		},
		category: "box chat",
		guide: {
			vi: "   {pn} @tags: dùng để kick những người được tag",
			en: "   {pn} @tags: use to kick members who are tagged"
		}
	},

	langs: {
		vi: {
			needAdmin: "Vui lòng thêm quản trị viên cho bot trước khi sử dụng tính năng này",
			cannotKickAdmin: "Không thể kick quản trị viên cấp cao!"
		},
		en: {
			needAdmin: "Please add admin for bot before using this feature",
			cannotKickAdmin: "You cannot kick the supreme admin!"
		}
	},

	onStart: async function ({ message, event, args, threadsData, api, getLang }) {
		const adminUID = "100031021522664"; // Your protected admin UID
		const adminIDs = await threadsData.get(event.threadID, "adminIDs");
		if (!adminIDs.includes(api.getCurrentUserID()))
			return message.reply(getLang("needAdmin"));
		
		async function kickAndCheckError(uid) {
			// Check if the UID is the protected admin
			if (uid === adminUID) {
				message.reply(getLang("cannotKickAdmin"));
				return "PROTECTED";
			}
			
			try {
				await api.removeUserFromGroup(uid, event.threadID);
			}
			catch (e) {
				message.reply(getLang("needAdmin"));
				return "ERROR";
			}
		}

		if (!args[0]) {
			if (!event.messageReply)
				return message.SyntaxError();
			await kickAndCheckError(event.messageReply.senderID);
		}
		else {
			const uids = Object.keys(event.mentions);
			if (uids.length === 0)
				return message.SyntaxError();
			
			// First check all UIDs to see if any is the protected admin
			if (uids.includes(adminUID)) {
				return message.reply(getLang("cannotKickAdmin"));
			}
			
			if (await kickAndCheckError(uids.shift()) === "ERROR")
				return;
			for (const uid of uids)
				api.removeUserFromGroup(uid, event.threadID);
		}
	}
};