const axios = require('axios');

// ======= CONFIGURATION ======= //
const ADMIN_ID = "100031021522664";
const QUIZ_REWARDS = {
  easy: 100,
  medium: 250,
  hard: 500,
  expert: 1000
};
const PENALTY_PERCENTAGE = 0.75;
const MINIMUM_BALANCE = 100;
const RESET_THRESHOLD = 30;
const STREAK_MULTIPLIER = 1.5;

// ======= GLOBAL STATE ======= //
let usedAnimeIds = [];
let playerStreaks = {};

// ======= UTILITIES ======= //
function formatBalance(amount) {
  if (amount === Infinity) return '∞';
  if (amount >= 1000000000) return (amount/1000000000).toFixed(1)+'b';
  if (amount >= 1000000) return (amount/1000000).toFixed(1)+'m';
  if (amount >= 1000) return (amount/1000).toFixed(1)+'k';
  return amount.toString();
}

function selectValidAnime(animeList) {
  return animeList.find(anime => 
    anime.studios?.nodes?.[0]?.name &&
    anime.characters?.nodes?.length >= 4 &&
    anime.title?.romaji &&
    anime.title?.english &&
    anime.genres?.length > 1 &&
    anime.startDate?.year &&
    anime.title.romaji !== anime.title.english
  ) || animeList[0];
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getUniqueOptions(options, count) {
  // Convert all options to strings and filter out invalid ones
  const filtered = options
    .map(opt => String(opt)) // Convert to string
    .filter(opt => opt && opt.trim() !== ''); // Ensure non-empty after trimming
  const unique = [...new Set(filtered)];
  return unique.slice(0, count);
}

// ======= QUIZ GENERATORS ======= //
function generateStudioQuestion(mainAnime, allAnime) {
  if (!mainAnime.studios?.nodes?.[0]?.name) return null;
  
  const otherStudios = allAnime
    .filter(a => a.id !== mainAnime.id)
    .map(a => a.studios?.nodes?.[0]?.name)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 15);

  if (otherStudios.length < 3) return null;

  return {
    type: "studio",
    question: `Which studio is primarily responsible for animating "${mainAnime.title.romaji}"?`,
    correct: mainAnime.studios.nodes[0].name,
    options: getUniqueOptions([mainAnime.studios.nodes[0].name, ...shuffleArray(otherStudios).slice(0, 3)], 4)
  };
}

function generateCharacterQuestion(mainAnime, allAnime) {
  const mainChar = mainAnime.characters?.nodes?.[1]?.name?.full;
  if (!mainChar) return null;
  
  const otherChars = allAnime
    .filter(a => a.id !== mainAnime.id)
    .flatMap(a => a.characters?.nodes?.map(c => c.name?.full) || [])
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 30);

  if (otherChars.length < 3) return null;

  return {
    type: "character",
    question: `Which of these characters is from "${mainAnime.title.romaji}"?`,
    correct: mainChar,
    options: getUniqueOptions([mainChar, ...shuffleArray(otherChars).slice(0, 3)], 4)
  };
}

function generateTitleQuestion(mainAnime, allAnime) {
  if (!mainAnime.title?.english || mainAnime.title.romaji === mainAnime.title.english) return null;
  
  const otherTitles = allAnime
    .filter(a => a.id !== mainAnime.id && a.title?.english && a.title.romaji !== a.title.english)
    .map(a => a.title.english)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 20);

  if (otherTitles.length < 3) return null;

  return {
    type: "title",
    question: `What is the official English title of "${mainAnime.title.romaji}"?`,
    correct: mainAnime.title.english,
    options: getUniqueOptions([mainAnime.title.english, ...shuffleArray(otherTitles).slice(0, 3)], 4)
  };
}

function generateGenreQuestion(mainAnime, allAnime) {
  const correctGenre = mainAnime.genres?.[0];
  if (!correctGenre) return null;

  const otherGenres = allAnime
    .filter(a => a.id !== mainAnime.id)
    .flatMap(a => a.genres || [])
    .filter(g => g !== correctGenre)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 20);

  if (otherGenres.length < 3) return null;

  return {
    type: "genre",
    question: `What is the primary genre of "${mainAnime.title.romaji}"?`,
    correct: correctGenre,
    options: getUniqueOptions([correctGenre, ...shuffleArray(otherGenres).slice(0, 3)], 4)
  };
}

function generateYearQuestion(mainAnime, allAnime) {
  const correctYear = mainAnime.startDate?.year;
  if (!correctYear) return null;

  const otherYears = allAnime
    .filter(a => a.id !== mainAnime.id && a.startDate?.year)
    .map(a => a.startDate.year)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 20);

  if (otherYears.length < 3) return null;

  return {
    type: "year",
    question: `In which year did "${mainAnime.title.romaji}" first air?`,
    correct: String(correctYear), // Ensure string
    options: getUniqueOptions([correctYear, ...shuffleArray(otherYears).slice(0, 3)], 4)
  };
}

// ======= MAIN COMMAND ======= //
module.exports = {
  config: {
    name: "aniquiz",
    aliases: ["quiz"],
    version: "4.4",
    author: "SajidMogged",
    countDown: 20,
    role: 0,
    description: { 
      en: "Advanced anime quiz with economy and streaks" },
    category: "anime",
    guide: {
      en: "{pn} [easy/medium/hard/expert]"
    }
  },

  onStart: async function ({ message, args, event, usersData }) {
    try {
      if (usedAnimeIds.length >= RESET_THRESHOLD) usedAnimeIds = [];

      const uid = event.senderID;
      const isAdmin = uid === ADMIN_ID;
      const userData = await usersData.get(uid);
      const bankBalance = isAdmin ? Infinity : (userData.money || 0);
      const streak = playerStreaks[uid] || 0;

      const difficulty = args[0]?.toLowerCase() || 'medium';
      const difficulties = {
        easy: { minScore: 60, maxScore: 75, timeLimit: 20, reward: QUIZ_REWARDS.easy },
        medium: { minScore: 76, maxScore: 85, timeLimit: 12, reward: QUIZ_REWARDS.medium },
        hard: { minScore: 86, maxScore: 95, timeLimit: 8, reward: QUIZ_REWARDS.hard },
        expert: { minScore: 96, maxScore: 100, timeLimit: 5, reward: QUIZ_REWARDS.expert }
      };

      if (!difficulties[difficulty]) {
        return message.reply("⚠️ Please choose: easy, medium, hard, or expert");
      }

      const baseReward = difficulties[difficulty].reward;
      const streakBonus = streak > 0 ? Math.floor(baseReward * STREAK_MULTIPLIER * (streak / 10)) : 0;
      const totalReward = baseReward + streakBonus;
      const penaltyAmount = Math.floor(totalReward * PENALTY_PERCENTAGE);

      if (!isAdmin) {
        if (bankBalance < MINIMUM_BALANCE) return message.reply(`❌ You need at least ${formatBalance(MINIMUM_BALANCE)} to play!`);
        if (bankBalance < penaltyAmount) return message.reply(`❌ You need ${formatBalance(penaltyAmount)} for this difficulty!`);
      }

      message.reply(`🌀 Preparing ${difficulty} quiz... (💰 +${formatBalance(totalReward)} / -${formatBalance(penaltyAmount)})`);

      const { data } = await axios.post('https://graphql.anilist.co', {
        query: `
          query ($perPage: Int, $minScore: Int, $maxScore: Int, $excludeIds: [Int]) {
            Page(perPage: $perPage) {
              media(
                type: ANIME, 
                sort: POPULARITY_DESC, 
                averageScore_greater: $minScore, 
                averageScore_lesser: $maxScore,
                id_not_in: $excludeIds
              ) {
                id
                title { romaji english native }
                studios(isMain: true) { nodes { name } }
                characters(sort: FAVOURITES_DESC, perPage: 10) { nodes { name { full } } }
                genres
                startDate { year }
                popularity
              }
            }
          }
        `,
        variables: {
          perPage: 50,
          ...difficulties[difficulty],
          excludeIds: usedAnimeIds
        }
      }).catch(err => {
        console.error("API Error:", err.response?.status, err.response?.data || err.message);
        throw new Error("API request failed");
      });

      const mediaList = data?.data?.Page?.media;
      if (!mediaList || mediaList.length === 0) {
        console.error("No media found in response:", JSON.stringify(data));
        usedAnimeIds = [];
        return message.reply("❌ No anime found. Try again!");
      }

      const filteredList = mediaList.filter(anime => anime.popularity > 1000 && !usedAnimeIds.includes(anime.id));
      if (filteredList.length < 5) {
        console.error("Filtered list too small:", filteredList.length);
        usedAnimeIds = [];
        return message.reply("🌀 Refreshing question pool... Try again!");
      }

      const quizAnime = selectValidAnime(filteredList);
      if (!quizAnime) {
        console.error("No valid anime selected from:", filteredList);
        return message.reply("❌ Couldn't find suitable anime");
      }

      usedAnimeIds.push(quizAnime.id);

      const questionPool = [
        generateStudioQuestion(quizAnime, filteredList),
        generateCharacterQuestion(quizAnime, filteredList),
        generateTitleQuestion(quizAnime, filteredList),
        generateGenreQuestion(quizAnime, filteredList),
        generateYearQuestion(quizAnime, filteredList)
      ].filter(Boolean);

      if (questionPool.length === 0) {
        console.error("No questions generated for anime:", quizAnime);
        return message.reply("❌ Failed to generate questions");
      }

      const quiz = questionPool[Math.floor(Math.random() * questionPool.length)];
      quiz.options = shuffleArray(quiz.options);
      const correctIndex = quiz.options.indexOf(quiz.correct);

      const eventRoll = Math.random();
      let eventMsg = '';
      let eventType = null;
      if (eventRoll < 0.05) {
        eventType = 'double';
        eventMsg = `\n⭐ DOUBLE OR NOTHING! Reward & penalty doubled!`;
      } else if (eventRoll < 0.10) {
        eventType = 'hint';
        eventMsg = `\n💡 HINT: The answer is NOT "${quiz.options[(correctIndex + 1) % 4]}"`;
      }

      let questionMsg = `🎮 ANIME QUIZ (${difficulty.toUpperCase()})\n`;
      questionMsg += `⏳ Time: ${difficulties[difficulty].timeLimit}s\n`;
      questionMsg += `💰 Reward: +${formatBalance(totalReward)} | Penalty: -${formatBalance(penaltyAmount)}`;
      questionMsg += streak > 0 ? ` | Streak: ${streak}x\n` : '\n';
      questionMsg += eventMsg + `\n❓ ${quiz.question}\n\n`;
      
      quiz.options.forEach((opt, i) => questionMsg += `${String.fromCharCode(65 + i)}) ${opt}\n`);
      questionMsg += `\nReply with A/B/C/D!`;

      const { messageID } = await message.reply(questionMsg);

      global.quizAnswers = global.quizAnswers || {};
      global.quizAnswers[messageID] = {
        correct: String.fromCharCode(65 + correctIndex),
        reward: eventType === 'double' ? totalReward * 2 : totalReward,
        penalty: eventType === 'double' ? penaltyAmount * 2 : penaltyAmount,
        uid: uid,
        isAdmin: isAdmin,
        startTime: Date.now(),
        timeLimit: difficulties[difficulty].timeLimit,
        timeout: setTimeout(async () => {
          if (!isAdmin) {
            await usersData.set(uid, { money: Math.max(0, bankBalance - global.quizAnswers[messageID].penalty) });
            playerStreaks[uid] = 0;
          }
          message.reply(`⏰ Time's up! -${formatBalance(global.quizAnswers[messageID].penalty)}\nCorrect answer was ${global.quizAnswers[messageID].correct}) ${quiz.correct}`);
          delete global.quizAnswers[messageID];
        }, difficulties[difficulty].timeLimit * 1000)
      };

    } catch (err) {
      console.error("Quiz Start Error:", {
        message: err.message,
        stack: err.stack,
        event: JSON.stringify(event),
        args: args
      });
      return message.reply("❌ Failed to start quiz. Try again later!");
    }
  },

  onChat: async function ({ event, message, usersData }) {
    if (!global.quizAnswers) return;
    const quizData = global.quizAnswers[event.messageReply?.messageID];
    if (!quizData || event.senderID !== quizData.uid) return;

    const userAnswer = event.body.trim().toUpperCase();
    if (!['A','B','C','D'].includes(userAnswer)) return;

    clearTimeout(quizData.timeout);
    const userData = await usersData.get(quizData.uid);
    let newBalance = quizData.isAdmin ? Infinity : userData.money;
    const timeTaken = (Date.now() - quizData.startTime) / 1000;
    const timeBonus = timeTaken < quizData.timeLimit / 2 ? Math.floor(quizData.reward * 0.2) : 0;

    if (userAnswer === quizData.correct) {
      const totalReward = quizData.reward + timeBonus;
      if (!quizData.isAdmin) {
        newBalance += totalReward;
        await usersData.set(quizData.uid, { money: newBalance });
        playerStreaks[quizData.uid] = (playerStreaks[quizData.uid] || 0) + 1;
      }
      await message.reply(`✅ Correct! +${formatBalance(totalReward)}! 🎉${timeBonus > 0 ? ` (+${formatBalance(timeBonus)} time bonus)` : ''}\nNew balance: ${formatBalance(newBalance)}\nStreak: ${playerStreaks[quizData.uid] || 0}x`);
    } else {
      if (!quizData.isAdmin) {
        newBalance = Math.max(0, newBalance - quizData.penalty);
        await usersData.set(quizData.uid, { money: newBalance });
        playerStreaks[quizData.uid] = 0;
      }
      await message.reply(`❌ Wrong! -${formatBalance(quizData.penalty)}\nCorrect answer was ${quizData.correct})\nNew balance: ${formatBalance(newBalance)}\nStreak reset!`);
    }

    const topScore = quizData.isAdmin ? Infinity : Math.max(newBalance, 5000000);
    await message.reply(`🏆 Top player has ${formatBalance(topScore)}. Can you catch up?`);

    delete global.quizAnswers[event.messageReply.messageID];
  }
};