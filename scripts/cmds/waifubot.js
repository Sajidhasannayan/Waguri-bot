const fs = require("fs");
const path = require("path");

const waifuTimers = {};
const lastListState = {};

const WAIFU_REALM_FILE = path.join(__dirname, "waifurealm.json");
const WAIFU_METADATA_FILE = path.join(__dirname, "waifu_metadata.json");

// load once
let WAIFU_DATA = [];
try {
  WAIFU_DATA = JSON.parse(fs.readFileSync(WAIFU_METADATA_FILE, "utf8"));
  console.log(`[WAIFU] Loaded ${WAIFU_DATA.length} waifus`);
} catch (e) {
  console.error("❌ Failed to load waifu_metadata.json", e);
}

function fetchRandomWaifu() {
  if (!WAIFU_DATA.length) return null;

  const w = WAIFU_DATA[Math.floor(Math.random() * WAIFU_DATA.length)];

  return {
    id: w.id,
    name: w.name,
    originalName: w.original_name || "-",
    romaji: w.romaji_name || "-",
    age: w.age ?? "Unknown",
    birthday: w.birthday_month
      ? `${w.birthday_month}/${w.birthday_day || "?"}/${w.birthday_year || "?"}`
      : "Unknown",
    anime: w.series?.name || "Unknown",
    rank: w.popularity_rank ?? 9999,
    image: w.display_picture,
    exp: Math.floor(Math.random() * 50) + 100
  };
}

function searchWaifus(query) {
  const q = query.toLowerCase();

  return WAIFU_DATA
    .filter(w =>
      w.name.toLowerCase().includes(q) ||
      (w.original_name && w.original_name.toLowerCase().includes(q)) ||
      (w.series?.name && w.series.name.toLowerCase().includes(q))
    )
    .map(w => ({
      name: w.name,
      originalName: w.original_name,
      romaji: w.romaji_name,
      anime: w.series?.name || "Unknown",
      rank: w.popularity_rank ?? 9999,
      image: w.display_picture
    }));
}

function saveCaughtWaifu(userID, waifu) {
  let data = {};
  if (fs.existsSync(WAIFU_REALM_FILE)) {
    data = JSON.parse(fs.readFileSync(WAIFU_REALM_FILE, "utf8"));
  }
  
  if (!data[userID]) data[userID] = [];
  
  const existing = data[userID].find(w => w.name === waifu.name);
  if (existing) {
    existing.count = (existing.count || 1) + 1;
  } else {
    data[userID].push({ 
      ...waifu, 
      count: 1 
    });
  }
  
  fs.writeFileSync(WAIFU_REALM_FILE, JSON.stringify(data, null, 2));
  return data[userID];
}

module.exports = {
  config: {
    name: "waifubot",
    version: "3.2",
    author: "ChatGPT x SajidMogged",
    countDown: 1,
    role: 0,
    shortDescription: "Catch waifus using mywaifulist-scraper",
    longDescription: "Live waifu encounters with search, EXP, and collection using the official scraper package.",
    category: "fun",
    guide: "/waifubot on | off | list | search <name>"
  },

  onStart: async function ({ message, event, threadsData, args }) {
    const threadID = event.threadID;
    const userID = event.senderID;

    if (args[0] === "on" || args[0] === "off") {
      await threadsData.set(threadID, args[0] === "on", "settings.waifubot");
      return message.reply(`Waifubot is now ${args[0] === "on" ? "enabled" : "disabled"}.`);
    }

    if (args[0] === "list") {
      const data = fs.existsSync(WAIFU_REALM_FILE) ? JSON.parse(fs.readFileSync(WAIFU_REALM_FILE, "utf8")) : {};
      const waifus = data[userID] || [];
      if (!waifus.length) return message.reply("You haven't caught any waifus yet.");

      const page = 1;
      const pageSize = 30;
      const pages = Math.ceil(waifus.length / pageSize);
      const slice = waifus.slice((page - 1) * pageSize, page * pageSize);

      let list = slice.map((w, i) => `${i + 1}. ${w.name} (x${w.count}) - Rank ${w.rank}`).join("\n");
      const reply = await message.reply(`🌸 Your Waifu Realm 🌸\n• Total unique waifus: ${waifus.length} (Total count: ${waifus.reduce((a, b) => a + b.count, 0)})\n\n${list}\n\n• Page ${page}/${pages}\nReply with a number to see details.`);

      lastListState[reply.messageID] = { userID, waifus, page, pages };
      global.GoatBot.onReply.set(reply.messageID, { commandName: "waifubot", type: "listPage" });
    }

    if (args[0] === "search") {
      const keyword = args.slice(1).join(" ");
      if (!keyword) return message.reply("Please enter a waifu name to search.");
      const results = await searchWaifus(keyword);
      if (!results.length) return message.reply("No waifus found.");

      const page = 1;
      const pageSize = 10;
      const pages = Math.ceil(results.length / pageSize);
      const slice = results.slice(0, pageSize);
      let list = slice.map((w, i) => `${i + 1}. ${w.name} - Rank ${w.rank}`).join("\n");

      const reply = await message.reply(`🌸 Waifu Search for "${keyword}" 🌸\n${list}\n\n• Page ${page}/${pages}\nReply with a number to see details.`);
      lastListState[reply.messageID] = { userID, waifus: results, page, pages, type: "searchPage" };
      global.GoatBot.onReply.set(reply.messageID, { commandName: "waifubot", type: "searchPage" });
    }
  },

  onChat: async function ({ message, event, threadsData }) {
    const threadID = event.threadID;
    const enabled = await threadsData.get(threadID, "settings.waifubot");
    if (!enabled) return;

    if (!waifuTimers[threadID]) waifuTimers[threadID] = { count: 0 };
    waifuTimers[threadID].count++;

    if (waifuTimers[threadID].count >= 5) {
      waifuTimers[threadID].count = 0;
      const waifu = await fetchRandomWaifu();
      if (!waifu) return;

      const msg = await message.send({
        body: `A cute waifu has emerged from another realm!\nYou Have to save her!\n\n- \"I feel myself slipping… I need you to help me. Please, call my name before I vanish!\"`,
        attachment: waifu.image
  ? await global.utils.getStreamFromURL(waifu.image)
  : null
      });

      global.GoatBot.onReply.set(msg.messageID, {
        commandName: "waifubot",
        type: "catch",
        waifu,
        threadID,
        messageID: msg.messageID,
        caught: false
      });
    }
  },

  onReply: async function ({ message, event, Reply }) {
    const userID = event.senderID;
    const input = event.body.toLowerCase().trim();

    if (Reply.type === "catch") {
      if (Reply.caught) return;
      const answers = [
  Reply.waifu.name.toLowerCase(),
  Reply.waifu.originalName?.toLowerCase(),
  Reply.waifu.romaji?.toLowerCase()
].filter(Boolean);

if (answers.some(n => n.includes(input))) {
        Reply.caught = true;
        const collection = saveCaughtWaifu(userID, Reply.waifu);
        const total = collection.reduce((a, b) => a + b.count, 0);

        await message.unsend(Reply.messageID);
        await message.reply({
          body: `"I was lost, but you found me. Thank you for saving me from the void."\n\n• You've earned the honor of ${Reply.waifu.name} (${Reply.waifu.anime}), and ${Reply.waifu.exp} experience.\nYou now have a total of ${total} waifus in your realm.`,
          attachment: await global.utils.getStreamFromURL(Reply.waifu.image)
        });

        global.GoatBot.onReply.delete(Reply.messageID);
      } else {
        message.reply("That's not her name...");
      }
    }

    if (["listPage", "searchPage"].includes(Reply.type)) {
      const state = lastListState[Reply.messageID];
      if (!state || state.userID !== userID) return;

      const waifus = state.waifus;
      let page = state.page;
      const pages = state.pages;
      const inputLower = input.toLowerCase();

      if (inputLower === "next") page++;
      else if (inputLower.startsWith("page ")) page = parseInt(inputLower.split(" ")[1]);
      else if (!isNaN(parseInt(input))) {
        const index = parseInt(input) - 1;
        const w = waifus[index];
        if (!w) return message.reply("Invalid waifu number.");

        return message.reply({
          body: `🌸 Waifu Details: ${w.name} 🌸\n• Original Name: ${w.originalName || "-"}\n• Romaji: ${w.romaji || "-"}\n• Birthday: ${w.birthday || "-"}\n• Age: ${w.age || "-"}\n• Popularity Rank: ${w.rank}\n• From: ${w.anime || w.url || "Unknown"}`,
          attachment: await global.utils.getStreamFromURL(w.image)
        });
      }

      const pageSize = state.type === "searchPage" ? 10 : 30;
      const start = (page - 1) * pageSize;
      const slice = waifus.slice(start, start + pageSize);
      const list = slice.map((w, i) => `${start + i + 1}. ${w.name}${w.count ? ` (x${w.count})` : ""} - Rank ${w.rank}`).join("\n");

      const title = state.type === "searchPage" ? `🌸 Waifu Search Results 🌸` : `🌸 Your Waifu Realm 🌸`;
      const extra = state.type === "searchPage" ? "" : `• Total unique waifus: ${waifus.length} (Total count: ${waifus.reduce((a, b) => a + b.count, 0)})\n\n`;

      const reply = await message.reply(`${title}\n${extra}${list}\n\n• Page ${page}/${pages}\nReply with a number to see details.`);
      lastListState[reply.messageID] = { ...state, page };
      global.GoatBot.onReply.set(reply.messageID, { commandName: "waifubot", type: state.type });
    }
  }
};
