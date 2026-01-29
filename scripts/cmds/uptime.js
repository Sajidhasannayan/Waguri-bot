let fontEnabled = true;

function formatFont(text) {
	const fontMapping = {
		a: "𝖺", b: "𝖻", c: "𝖼", d: "𝖽", e: "𝖾", f: "𝖿", g: "𝗀", h: "𝗁", i: "𝗂", j: "𝗃", k: "𝗄", l: "𝗅", m: "𝗆",
		n: "𝗇", o: "𝗈", p: "𝗉", q: "𝗊", r: "𝗋", s: "𝗌", t: "𝗍", u: "𝗎", v: "𝗏", w: "𝗐", x: "𝗑", y: "𝗒", z: "𝗓",
		A: "𝖠", B: "𝖡", C: "𝖢", D: "𝖣", E: "𝖤", F: "𝖥", G: "𝖦", H: "𝖧", I: "𝖨", J: "𝖩", K: "𝖪", L: "𝖫", M: "𝖬",
		N: "𝖭", O: "𝖮", P: "𝖯", Q: "𝖰", R: "𝖱", S: "𝖲", T: "𝖳", U: "𝖴", V: "𝖵", W: "𝖶", X: "𝖷", Y: "𝖸", Z: "𝖹"
	};

	let formattedText = "";
	for (const char of text) {
		if (fontEnabled && char in fontMapping) {
			formattedText += fontMapping[char];
		} else {
			formattedText += char;
		}
	}

	return formattedText;
}

const os = require('os');
const fs = require('fs').promises;
const pidusage = require('pidusage');

async function getStartTimestamp() {
	try {
		const startTimeStr = await fs.readFile('time.txt', 'utf8');
		return parseInt(startTimeStr);
	} catch (error) {
		return Date.now();
	}
}

async function saveStartTimestamp(timestamp) {
	try {
		await fs.writeFile('time.txt', timestamp.toString());
	} catch (error) {
		console.error('Error saving start timestamp:', error);
	}
}

function byte2mb(bytes) {
	const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	let l = 0, n = parseInt(bytes, 10) || 0;
	while (n >= 1024 && ++l) n = n / 1024;
	return `${n.toFixed(n < 10 && l > 0 ? 1 : 0)} ${units[l]}`;
}

function getUptime(uptime) {
	const days = Math.floor(uptime / (3600 * 24));
	const hours = Math.floor((uptime % (3600 * 24)) / 3600);
	const mins = Math.floor((uptime % 3600) / 60);
	const seconds = Math.floor(uptime % 60);
	const months = Math.floor(days / 30);
		const remainingDays = days % 30;

	return `Uptime: ${months} month(s}, ${remainingDays} day(s), ${hours} hour(s), ${mins} minute(s), and ${seconds} second(s)`;
}

async function onStart({ api, event }) {
	const startTime = await getStartTimestamp();
	const botUptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
	const systemUptimeSeconds = os.uptime();

	const usage = await pidusage(process.pid);
	const totalMem = os.totalmem();
	const freeMem = os.freemem();

	const formatTime = (seconds) => {
		const d = Math.floor(seconds / 86400);
		const h = Math.floor((seconds % 86400) / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		return `${d} day${d !== 1 ? 's' : ''}, ${h} hour${h !== 1 ? 's' : ''}, ${m} minute${m !== 1 ? 's' : ''}, ${s} second${s !== 1 ? 's' : ''}`;
	};

	const timeStart = Date.now();
	const botUptime = formatTime(botUptimeSeconds);
	const systemUptime = formatTime(systemUptimeSeconds);
	const ping = Date.now() - timeStart;

	const uid = "100074220753602";
	const info = [
		`𝗕𝗼𝘁 𝗨𝗽𝘁𝗶𝗺𝗲: ${botUptime}`,
		`𝗦𝗲𝗿𝘃𝗲𝗿 𝗨𝗽𝘁𝗶𝗺𝗲: ${systemUptime}`,
		`𝗖𝗣𝗨 𝗨𝘀𝗮𝗴𝗲: ${usage.cpu.toFixed(1)}%`,
		`𝗥𝗔𝗠 𝗨𝘀𝗮𝗴𝗲: ${byte2mb(usage.memory)} / ${byte2mb(totalMem)} (${byte2mb(freeMem)} free)`,
		`𝗖𝗼𝗿𝗲𝘀: ${os.cpus().length}`,
		`𝗣𝗶𝗻𝗴: ${ping}ms`,
		`𝗢𝗦: ${os.platform()} (${os.arch()})`
	].join('\n');

	await saveStartTimestamp(startTime);
	return api.shareContact(formatFont(info), uid, event.threadID);
}

module.exports = {
	config: {
		name: 'uptime',
		version: '2.0',
		author: "SajidMogged",
		countDown: 5,
		role: 2,
		shortDescription: 'shows how long uptime',
		Description: {
			en: 'bot system info'
		},
		category: "owner",
		guide: {
			en: " {p}uptime "
		}
	},
	byte2mb,
	getStartTimestamp,
	saveStartTimestamp,
	getUptime,
	onStart
};