const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");
const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;
const doNotDelete = "[ 🤖 | SAJID MOGGED ]";

module.exports = {
	config: {
		name: "help",
		version: "1.21",
		author: "SajidMogged",
		countDown: 10,
		role: 0,
		description: {
			en: "View command usage"
		},
		category: "info",
		guide: {
			en: "{pn} [empty | <page number> | <command name>]"
				+ "\n   {pn} <command name> [-u | usage | -g | guide]: only show command usage"
				+ "\n   {pn} <command name> [-i | info]: only show command info"
				+ "\n   {pn} <command name> [-r | role]: only show command role"
				+ "\n   {pn} <command name> [-a | alias]: only show command alias"
		},
		priority: 1
	},

	langs: {
		en: {
			help: "╔═━『 %1 』━═╗\n%2\n╚══════════════╝",
			help2: "%1\n╭───────────◊\n│ » Total cmds: [ %2 ].\n│ » Type [ %3help <cmd> ]\n│    to learn the usage.\n│ » SponsoredBy\n│  • 〘 %4 〙\n╰────────◊",
			commandNotFound: "Command \"%1\" does not exist",
			getInfoCommand: "╔═━『 COMMAND INFO 』━═╗\n» Name: %1\n» Description: %2\n» Aliases: %3\n» Group Aliases: %4\n» Version: %5\n» Role: %6\n» Cooldown: %7s\n» Author: %8\n╚══════════════╝\n\n╔═━『 USAGE 』━═╗\n%9\n╚══════════════╝\n\n» Notes:\n• Content in <XXXXX> can be changed\n• Content in [A|B|C] means a or b or c",
			onlyInfo: "╔═━『 COMMAND INFO 』━═╗\n» Name: %1\n» Description: %2\n» Aliases: %3\n» Group Aliases: %4\n» Version: %5\n» Role: %6\n» Cooldown: %7s\n» Author: %8\n╚══════════════╝",
			onlyUsage: "╔═━『 USAGE 』━═╗\n%1\n╚══════════════╝",
			onlyAlias: "╔═━『 ALIASES 』━═╗\n» Other names: %1\n» Group-specific names: %2\n╚══════════════╝",
			onlyRole: "╔═━『 ROLE 』━═╗\n» %1\n╚══════════════╝",
			doNotHave: "None",
			roleText0: "0 (All users)",
			roleText1: "1 (Group admins)",
			roleText2: "2 (Bot admins)",
			roleText0setRole: "0 (set role, all users)",
			roleText1setRole: "1 (set role, group admins)",
			pageNotFound: "Page %1 does not exist"
		}
	},

	onStart: async function ({ message, args, event, threadsData, getLang, role, globalData }) {
		const langCode = await threadsData.get(event.threadID, "data.lang") || global.GoatBot.config.language;
		let customLang = {};
		const pathCustomLang = path.normalize(`${process.cwd()}/languages/cmds/${langCode}.js`);
		if (fs.existsSync(pathCustomLang))
			customLang = require(pathCustomLang);

		const { threadID } = event;
		const threadData = await threadsData.get(threadID);
		const prefix = getPrefix(threadID);
		const sortHelp = "category";
		const commandName = (args[0] || "").toLowerCase();
		let command = commands.get(commandName) || commands.get(aliases.get(commandName));
		const aliasesData = threadData.data.aliases || {};

		if (!command) {
			for (const cmdName in aliasesData) {
				if (aliasesData[cmdName].includes(commandName)) {
					command = commands.get(cmdName);
					break;
				}
			}
		}

		if (!command) {
			const globalAliasesData = await globalData.get('setalias', 'data', []);
			for (const item of globalAliasesData) {
				if (item.aliases.includes(commandName)) {
					command = commands.get(item.commandName);
					break;
				}
			}
		}

		const sendAndAutoUnsend = async (messageContent) => {
			try {
				const sentMessage = await message.reply(messageContent);
				// Set timer to unsend after 1 minute (60000 milliseconds)
				setTimeout(async () => {
					try {
						await message.unsend(sentMessage.messageID);
					} catch (e) {
						console.error("Error while unsending message:", e);
					}
				}, 60000);
			} catch (e) {
				console.error("Error while sending message:", e);
			}
		};

		if (!command && !args[0] || !isNaN(args[0])) {
			const categoryMap = new Map();
			
			for (const [name, value] of commands) {
				if (value.config.role > 1 && role < value.config.role)
					continue;
				
				const category = value.config.category?.toUpperCase() || "NO CATEGORY";
				if (!categoryMap.has(category)) {
					categoryMap.set(category, []);
				}
				categoryMap.get(category).push(name);
			}
			
			const sortedCategories = Array.from(categoryMap.keys()).sort();
			
			let msg = "";
			for (const category of sortedCategories) {
				const commandsList = categoryMap.get(category);
				commandsList.sort();
				
				let categoryCommands = "";
				for (let i = 0; i < commandsList.length; i++) {
					categoryCommands += `⩺${commandsList[i]}${i < commandsList.length - 1 ? " " : ""}`;
					if ((i + 1) % 6 === 0) {
						categoryCommands += "\n";
					}
				}
				
				msg += getLang("help", category, categoryCommands);
				msg += "\n\n";
			}
			
			msg = msg.trim();
			
			const totalCommands = commands.size;
			await sendAndAutoUnsend(getLang("help2", msg, totalCommands, prefix, doNotDelete));
		}
		else if (!command && args[0]) {
			await sendAndAutoUnsend(getLang("commandNotFound", args[0]));
		}
		else {
			const formSendMessage = {};
			const configCommand = command.config;

			let guide = configCommand.guide?.[langCode] || configCommand.guide?.["en"];
			if (guide == undefined)
				guide = customLang[configCommand.name]?.guide?.[langCode] || customLang[configCommand.name]?.guide?.["en"];

			guide = guide || { body: "" };
			if (typeof guide == "string")
				guide = { body: guide };
			const guideBody = guide.body
				.replace(/\{prefix\}|\{p\}/g, prefix)
				.replace(/\{name\}|\{n\}/g, configCommand.name)
				.replace(/\{pn\}/g, prefix + configCommand.name);

			const aliasesString = configCommand.aliases ? configCommand.aliases.join(", ") : getLang("doNotHave");
			const aliasesThisGroup = threadData.data.aliases ? (threadData.data.aliases[configCommand.name] || []).join(", ") : getLang("doNotHave");

			let roleOfCommand = configCommand.role;
			let roleIsSet = false;
			if (threadData.data.setRole?.[configCommand.name]) {
				roleOfCommand = threadData.data.setRole[configCommand.name];
				roleIsSet = true;
			}

			const roleText = roleOfCommand == 0 ?
				(roleIsSet ? getLang("roleText0setRole") : getLang("roleText0")) :
				roleOfCommand == 1 ?
					(roleIsSet ? getLang("roleText1setRole") : getLang("roleText1")) :
					getLang("roleText2");

			const author = configCommand.author || "Unknown";
			const descriptionCustomLang = customLang[configCommand.name]?.description;
			let description = checkLangObject(configCommand.description, langCode);
			if (description == undefined)
				if (descriptionCustomLang != undefined)
					description = checkLangObject(descriptionCustomLang, langCode);
				else
					description = getLang("doNotHave");

			let sendWithAttachment = false;

			if (args[1]?.match(/^-g|guide|-u|usage$/)) {
				formSendMessage.body = getLang("onlyUsage", guideBody.split("\n").join("\n» "));
				sendWithAttachment = true;
			}
			else if (args[1]?.match(/^-a|alias|aliase|aliases$/))
				formSendMessage.body = getLang("onlyAlias", aliasesString, aliasesThisGroup);
			else if (args[1]?.match(/^-r|role$/))
				formSendMessage.body = getLang("onlyRole", roleText);
			else if (args[1]?.match(/^-i|info$/))
				formSendMessage.body = getLang(
					"onlyInfo",
					configCommand.name,
					description,
					aliasesString,
					aliasesThisGroup,
					configCommand.version,
					roleText,
					configCommand.countDown || 1,
					author
				);
			else {
				formSendMessage.body = getLang(
					"getInfoCommand",
					configCommand.name,
					description,
					aliasesString,
					aliasesThisGroup,
					configCommand.version,
					roleText,
					configCommand.countDown || 1,
					author,
					guideBody.split("\n").join("\n» ")
				);
				sendWithAttachment = true;
			}

			if (sendWithAttachment && guide.attachment) {
				if (typeof guide.attachment == "object" && !Array.isArray(guide.attachment)) {
					const promises = [];
					formSendMessage.attachment = [];

					for (const keyPathFile in guide.attachment) {
						const pathFile = path.normalize(keyPathFile);

						if (!fs.existsSync(pathFile)) {
							const cutDirPath = path.dirname(pathFile).split(path.sep);
							for (let i = 0; i < cutDirPath.length; i++) {
								const pathCheck = `${cutDirPath.slice(0, i + 1).join(path.sep)}${path.sep}`;
								if (!fs.existsSync(pathCheck))
									fs.mkdirSync(pathCheck);
							}
							const getFilePromise = axios.get(guide.attachment[keyPathFile], { responseType: 'arraybuffer' })
								.then(response => {
									fs.writeFileSync(pathFile, Buffer.from(response.data));
								});

							promises.push({
								pathFile,
								getFilePromise
							});
						}
						else {
							promises.push({
								pathFile,
								getFilePromise: Promise.resolve()
							});
						}
					}

					await Promise.all(promises.map(item => item.getFilePromise));
					for (const item of promises)
						formSendMessage.attachment.push(fs.createReadStream(item.pathFile));
				}
			}

			await sendAndAutoUnsend(formSendMessage);
		}
	}
};

function checkLangObject(data, langCode) {
	if (typeof data == "string")
		return data;
	if (typeof data == "object" && !Array.isArray(data))
		return data[langCode] || data.en || undefined;
	return undefined;
}