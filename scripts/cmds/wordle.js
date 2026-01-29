const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Word list from JSON file
const wordFile = path.join(__dirname, "wordle_list.json");
let wordLists = {};
if (fs.existsSync(wordFile)) {
    wordLists = JSON.parse(fs.readFileSync(wordFile, "utf8"));
}

// Game configuration
const rows = {
    3: { attempts: 6, baseReward: 10 },
    4: { attempts: 6, baseReward: 15 },
    5: { attempts: 6, baseReward: 20 },
    6: { attempts: 6, baseReward: 25 },
    7: { attempts: 6, baseReward: 30 },
    8: { attempts: 8, baseReward: 40 },
    9: { attempts: 8, baseReward: 50 },
    10: { attempts: 8, baseReward: 60 },
    11: { attempts: 8, baseReward: 70 },
    12: { attempts: 8, baseReward: 80 },
    13: { attempts: 8, baseReward: 90 },
    14: { attempts: 8, baseReward: 100 }
};

// Storage system
const dataPath = path.join(__dirname, 'wordle_data.json');

function loadData() {
    try {
        if (fs.existsSync(dataPath)) {
            return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        }
        return [];
    } catch (err) {
        console.error('Error loading data:', err);
        return [];
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error saving data:', err);
    }
}

function getRandomWord(length) {
    const list = wordLists[length];
    if (!list || list.length === 0) {
        throw new Error(`No words available for length ${length}`);
    }
    return list[Math.floor(Math.random() * list.length)].toUpperCase();
}

function calculateRewards(wordLength, attemptsUsed, timeTaken) {
    const config = rows[wordLength];
    let baseReward = config.baseReward;
    
    // Word length bonus (only for words 5 letters and longer)
    const lengthBonus = wordLength >= 5 ? Math.floor(wordLength * 1.5) : 0;
    
    // Speed bonus (faster guesses get more points)
    const maxTime = 600; // 10 minutes in seconds
    const timeBonus = Math.max(0, Math.floor((maxTime - Math.min(timeTaken, maxTime)) / 30));
    
    // Efficiency bonus (fewer attempts used = more points)
    const maxAttempts = config.attempts;
    const efficiencyBonus = Math.max(0, Math.floor((maxAttempts - attemptsUsed) * 2));
    
    // Calculate XP (base on word length + efficiency)
    const xp = Math.floor(wordLength * 0.7 + (maxAttempts - attemptsUsed) * 0.5);
    
    const totalCoins = baseReward + lengthBonus + timeBonus + efficiencyBonus;
    
    return {
        coins: {
            base: baseReward,
            length: lengthBonus,
            speed: timeBonus,
            efficiency: efficiencyBonus,
            total: totalCoins
        },
        xp: xp
    };
}

module.exports = {
    config: {
        name: "wordle",
        aliases: ["wordguess"],
        version: "2.0",
        author: "SajidMogged",
        countDown: 5,
        role: 0,
        description: { 
        en: "Word guessing game" 
        },
        category: "game",
        guide: {
            en: "  {pn} [3-14]: start a new game with word length (default 4)\n" +
                "  Example:\n" +
                "    {pn}\n" +
                "    {pn} 10\n\n" +
                "  How to play:\n" +
                "  - You have 6 attempts for words 3-7 letters, 8 attempts for 8-14 letters\n" +
                "  - After each guess, you'll get color hints:\n" +
                "    🟩 (green) = correct letter in correct position\n" +
                "    🟨 (yellow) = correct letter in wrong position\n" +
                "    ⬛ (gray) = letter not in word\n\n" +
                "  {pn} top: view the top 10 players\n" +
                "  {pn} info [<uid> | <@tag> | <reply> | <empty>]: view player stats\n" +
                "  {pn} reset: reset the leaderboard (admin only)"
        }
    },

    langs: {
        en: {
            charts: "📊 **Wordle Leaderboard**\n\n%1",
            noScore: "⭕ | No players have scored yet.",
            noPermissionReset: "⚠️ | You don't have permission to reset the leaderboard.",
            notFoundUser: "⚠️ | Player with ID %1 not found.",
            userRankInfo: "📊 **Player Stats - %1**\n\n├ Wins: %2/%3 (%4%)\n├ Avg Word Length: %5\n├ Avg Guesses: %6\n└ Avg Time: %7s",
            resetRankSuccess: "✅ | Leaderboard reset successfully.",
            invalidLength: "⚠️ | Please choose word length between 3 and 14",
            created: "✅ | Game created! Guess a %1-letter word.",
            gameName: "WORDLE",
            gameGuide: "⏳ | You have %1 attempts to guess the %2-letter word.",
            gameNote: "📄 | After each guess, letters will be colored:\n🟩 = Correct letter & position\n🟨 = Correct letter, wrong position\n⬛ = Letter not in word",
            replyToPlayGame: "🎮 | Reply with your %1-letter guess:",
            invalidWord: "⚠️ | Please enter a %1-letter word with letters only",
            win: "🎉 Congratulations! You guessed the word in %2 tries and %3 seconds! 🏆\n\n💰 Rewards Breakdown:\n├ Base Reward: %4 coins\n├ Word Length Bonus: %5 coins\n├ Speed Bonus: %6 coins\n├ Efficiency Bonus: %7 coins\n└ Total: %8 coins and 🪙 %9 XP\n\nWant to play again? Type /wordle to start a new game!",
            loss: "🤦‍♂️ | Game over! The word was %1."
        }
    },

    onStart: async function ({ message, event, getLang, commandName, args, usersData, role }) {
        if (args[0] === "top") {
            const wordleData = loadData();
            if (!wordleData.length)
                return message.reply(getLang("noScore"));

            // Sort by wins (descending) then by average guesses (ascending)
            const sortedPlayers = [...wordleData].sort((a, b) => {
                const aWins = a.wins?.length || 0;
                const bWins = b.wins?.length || 0;
                if (bWins !== aWins) return bWins - aWins;
                
                const aTotalGames = aWins + (a.losses?.length || 0);
                const bTotalGames = bWins + (b.losses?.length || 0);
                const aWinRate = aTotalGames > 0 ? aWins / aTotalGames : 0;
                const bWinRate = bTotalGames > 0 ? bWins / bTotalGames : 0;
                if (bWinRate !== aWinRate) return bWinRate - aWinRate;
                
                const aAvgGuesses = aWins > 0 ? a.wins.reduce((sum, win) => sum + win.tryNumber, 0) / aWins : 0;
                const bAvgGuesses = bWins > 0 ? b.wins.reduce((sum, win) => sum + win.tryNumber, 0) / bWins : 0;
                return aAvgGuesses - bAvgGuesses;
            }).slice(0, 10);

            const topPlayersText = await Promise.all(sortedPlayers.map(async (item, index) => {
                const userName = await usersData.getName(item.id);
                const wins = item.wins?.length || 0;
                const losses = item.losses?.length || 0;
                const totalGames = wins + losses;
                const winRate = totalGames > 0 ? (wins / totalGames * 100).toFixed(1) : "0.0";
                
                // Calculate averages
                const avgWordLength = wins > 0 ? 
                    (item.wins.reduce((sum, win) => sum + win.wordLength, 0) / wins).toFixed(2) : "0.00";
                const avgGuesses = wins > 0 ? 
                    (item.wins.reduce((sum, win) => sum + win.tryNumber, 0) / wins).toFixed(2) : "0.00";
                const avgTime = totalGames > 0 ? 
                    ((item.wins.reduce((sum, win) => sum + win.timeSuccess, 0) + 
                     (item.losses?.reduce((sum, loss) => sum + loss.timeSuccess, 0) || 0)) / totalGames / 1000).toFixed(2) : "0.00";
                
                return `#${index + 1}. ${userName}\n├ Wins: ${wins}/${totalGames} (${winRate}%)\n├ Avg Word Length: ${avgWordLength}\n├ Avg Guesses: ${avgGuesses}\n└ Avg Time: ${avgTime}s`;
            }));

            return message.reply(getLang("charts", topPlayersText.join("\n\n")));
        }
        else if (args[0] === "info") {
            const wordleData = loadData();
            let targetID;
            if (Object.keys(event.mentions).length)
                targetID = Object.keys(event.mentions)[0];
            else if (event.messageReply)
                targetID = event.messageReply.senderID;
            else if (!isNaN(args[1]))
                targetID = args[1];
            else
                targetID = event.senderID;

            const userData = wordleData.find(item => item.id == targetID);
            if (!userData)
                return message.reply(getLang("notFoundUser", targetID));

            const userName = await usersData.getName(targetID);
            const wins = userData.wins?.length || 0;
            const losses = userData.losses?.length || 0;
            const totalGames = wins + losses;
            const winRate = totalGames > 0 ? (wins / totalGames * 100).toFixed(1) : "0.0";
            
            // Calculate averages
            const avgWordLength = wins > 0 ? 
                (userData.wins.reduce((sum, win) => sum + win.wordLength, 0) / wins).toFixed(2) : "0.00";
            const avgGuesses = wins > 0 ? 
                (userData.wins.reduce((sum, win) => sum + win.tryNumber, 0) / wins).toFixed(2) : "0.00";
            const avgTime = totalGames > 0 ? 
                ((userData.wins.reduce((sum, win) => sum + win.timeSuccess, 0) + 
                 (userData.losses?.reduce((sum, loss) => sum + loss.timeSuccess, 0) || 0)) / totalGames / 1000).toFixed(2) : "0.00";
            
            return message.reply(getLang("userRankInfo", 
                userName, 
                wins, 
                totalGames, 
                winRate, 
                avgWordLength, 
                avgGuesses, 
                avgTime));
        }
        else if (args[0] === "reset") {
            if (role < 2)
                return message.reply(getLang("noPermissionReset"));
            saveData([]);
            return message.reply(getLang("resetRankSuccess"));
        }

        // Start a new game
        const wordLength = parseInt(args[0]) || 4;
        if (wordLength < 3 || wordLength > 14)
            return message.reply(getLang("invalidLength"));

        const gameConfig = rows[wordLength];
        let answer;
        try {
            answer = getRandomWord(wordLength);
        } catch (e) {
            return message.reply(`Error: ${e.message}`);
        }

        const options = {
            wordLength,
            attempts: gameConfig.attempts,
            timeStart: Date.now(),
            guesses: [],
            tryNumber: 0,
            ctx: null,
            canvas: null,
            answer: answer.toUpperCase(),
            gameName: getLang("gameName"),
            baseReward: gameConfig.baseReward
        };

        const gameData = wordleGame(options);

        const messageData = message.reply(getLang("created", wordLength));
        gameData.messageData = messageData;

        message.reply({
            attachment: gameData.imageStream
        }, (err, info) => {
            global.GoatBot.onReply.set(info.messageID, {
                commandName,
                messageID: info.messageID,
                author: event.senderID,
                gameData
            });
        });
    },

    onReply: async ({ message, Reply, event, getLang, commandName, usersData }) => {
        const { gameData: oldGameData } = Reply;
        if (event.senderID != Reply.author)
            return;

        const guess = (event.body || "").trim().toLowerCase();
        if (guess.length !== oldGameData.wordLength || !/^[a-z]+$/.test(guess))
            return message.reply(getLang("invalidWord", oldGameData.wordLength));

        global.GoatBot.onReply.delete(Reply.messageID);

        oldGameData.guesses.push(guess);
        const gameData = wordleGame(oldGameData);

        if (gameData.isWin === null) {
            message.reply({
                attachment: gameData.imageStream
            }, (err, info) => {
                message.unsend(Reply.messageID);
                global.GoatBot.onReply.set(info.messageID, {
                    commandName,
                    messageID: info.messageID,
                    author: event.senderID,
                    gameData
                });
            });
        } else {
            const wordleData = loadData();
            const timeTaken = Math.floor((Date.now() - oldGameData.timeStart) / 1000);
            let rewards = { coins: { total: 0 }, xp: 0 };
            
            if (gameData.isWin) {
                rewards = calculateRewards(
                    gameData.wordLength,
                    gameData.tryNumber,
                    timeTaken
                );
                
                // Add coins and XP to user
                await usersData.set(event.senderID, {
                    money: (await usersData.get(event.senderID)).money + rewards.coins.total,
                    exp: (await usersData.get(event.senderID)).exp + rewards.xp
                });
            }
            
            const messageText = gameData.isWin ?
                getLang(
                    "win",
                    gameData.answer,
                    gameData.tryNumber,
                    timeTaken,
                    rewards.coins.base,
                    rewards.coins.length,
                    rewards.coins.speed,
                    rewards.coins.efficiency,
                    rewards.coins.total,
                    rewards.xp
                ) :
                getLang("loss", gameData.answer);
            
            message.unsend((await oldGameData.messageData).messageID);
            message.unsend(Reply.messageID);
            message.reply({
                body: messageText,
                attachment: gameData.imageStream
            });

            // Update leaderboard
            const userIndex = wordleData.findIndex(item => item.id == event.senderID);
            const data = {
                tryNumber: gameData.tryNumber,
                timeSuccess: Date.now() - oldGameData.timeStart,
                date: new Date().toISOString(),
                wordLength: gameData.wordLength
            };

            if (gameData.isWin) {
                if (userIndex === -1) {
                    wordleData.push({
                        id: event.senderID,
                        wins: [data],
                        losses: [],
                        points: rewards.coins.total
                    });
                } else {
                    wordleData[userIndex].wins.push(data);
                    wordleData[userIndex].points += rewards.coins.total;
                }
            } else {
                if (userIndex === -1) {
                    wordleData.push({
                        id: event.senderID,
                        wins: [],
                        losses: [data],
                        points: 0
                    });
                } else {
                    wordleData[userIndex].losses.push(data);
                }
            }
            saveData(wordleData);
        }
    }
};

function wordleGame(options) {
    let { guesses, ctx, canvas, tryNumber, attempts, ctxGuesses, canvasGuesses, ctxHighlights } = options;
    const { wordLength, answer, gameName } = options;
    
    tryNumber = guesses.length;

    // Game board dimensions
    const squareSize = wordLength <= 8 ? 62 : Math.max(40, 62 - (wordLength - 8) * 4);
    const squareSpacing = 12;
    const lineWidth = 3;
    const radius = 4;
    const marginX = 50;
    const marginY = 80;
    const titleHeight = 60;
    const backgroundColor = '#121213';
    const defaultLetterColor = '#FFFFFF';
    const correctPositionColor = '#538D4E';
    const correctLetterColor = '#B59F3B';
    const wrongLetterColor = '#3A3A3C';

    // Font settings
    const fontTitle = `bold ${wordLength <= 8 ? 48 : 36}px "Arial"`;
    const fontLetters = `bold ${wordLength <= 8 ? 44 : 32}px "Arial"`;
    const fontResult = 'bold 72px "Arial"';

    if (!ctx && !canvas) {
        // Calculate canvas size
        const width = wordLength * squareSize + (wordLength - 1) * squareSpacing + marginX * 2;
        const height = titleHeight + attempts * (squareSize + squareSpacing) + marginY;
        
        // Create main canvas
        canvas = createCanvas(width, height);
        ctx = canvas.getContext('2d');
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw game title
        ctx.font = fontTitle;
        ctx.fillStyle = defaultLetterColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(gameName, canvas.width / 2, titleHeight / 2);

        // Draw empty squares for all attempts
        for (let row = 0; row < attempts; row++) {
            for (let col = 0; col < wordLength; col++) {
                drawLetterSquare(ctx, col, row, '', squareSize, squareSpacing, marginX, titleHeight, 
                                radius, lineWidth, backgroundColor, wrongLetterColor);
            }
        }

        // Create canvases for highlights and guesses
        canvasGuesses = createCanvas(canvas.width, canvas.height);
        ctxGuesses = canvasGuesses.getContext('2d');
        ctxHighlights = createCanvas(canvas.width, canvas.height).getContext('2d');
    }

    // Process guesses
    let isWin = null;
    if (guesses.length > 0) {
        // Clear previous drawings
        ctxGuesses.clearRect(0, 0, canvasGuesses.width, canvasGuesses.height);
        ctxHighlights.clearRect(0, 0, canvas.width, canvas.height);

        // Process each guess
        for (let row = 0; row < guesses.length; row++) {
            const guess = guesses[row].toUpperCase();
            const answerLetters = answer.split('');

            // First pass: mark correct positions (green)
            for (let col = 0; col < wordLength; col++) {
                if (guess[col] === answer[col]) {
                    drawLetterSquare(ctxHighlights, col, row, '', squareSize, squareSpacing, marginX, titleHeight, 
                                    radius, lineWidth, correctPositionColor, correctPositionColor);
                    answerLetters[col] = null; // Mark as used
                }
            }

            // Second pass: mark correct letters in wrong position (yellow)
            for (let col = 0; col < wordLength; col++) {
                if (guess[col] !== answer[col]) {
                    const foundIndex = answerLetters.indexOf(guess[col]);
                    if (foundIndex !== -1) {
                        drawLetterSquare(ctxHighlights, col, row, '', squareSize, squareSpacing, marginX, titleHeight, 
                                        radius, lineWidth, correctLetterColor, correctLetterColor);
                        answerLetters[foundIndex] = null; // Mark as used
                    } else {
                        drawLetterSquare(ctxHighlights, col, row, '', squareSize, squareSpacing, marginX, titleHeight, 
                                        radius, lineWidth, wrongLetterColor, wrongLetterColor);
                    }
                }
            }

            // Draw letters on top
            for (let col = 0; col < wordLength; col++) {
                drawLetter(ctxGuesses, col, row, guess[col], squareSize, squareSpacing, marginX, titleHeight, 
                          radius, defaultLetterColor, fontLetters);
            }
        }

        // Check win/lose condition
        const lastGuess = guesses[guesses.length - 1].toUpperCase();
        if (lastGuess === answer) {
            isWin = true;
        } else if (guesses.length >= attempts) {
            isWin = false;
        }

        // Draw result if game over
        if (isWin !== null) {
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;

            ctx.font = fontResult;
            ctx.fillStyle = isWin ? correctPositionColor : '#FF5555';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(isWin ? 'YOU WIN!' : 'GAME OVER', canvas.width / 2, canvas.height / 2 - 40);
            
            ctx.font = 'bold 36px Arial';
            ctx.fillStyle = defaultLetterColor;
            ctx.fillText(`The word was: ${answer}`, canvas.width / 2, canvas.height / 2 + 40);
            ctx.restore();
        }

        // Combine all layers
        ctx.drawImage(ctxHighlights.canvas, 0, 0);
        ctx.drawImage(canvasGuesses, 0, 0);
    }

    const imageStream = canvas.createPNGStream();
    imageStream.path = `wordle_${Date.now()}.png`;

    return {
        ...options,
        imageStream,
        ctx,
        canvas,
        tryNumber,
        isWin,
        ctxGuesses,
        canvasGuesses,
        ctxHighlights
    };
}

function drawLetterSquare(ctx, col, row, letter, size, spacing, marginX, marginY, radius, lineWidth, fillColor, strokeColor) {
    const x = marginX + col * (size + spacing);
    const y = marginY + row * (size + spacing);
    
    // Draw filled square
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, radius);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, radius);
    ctx.stroke();
}

function drawLetter(ctx, col, row, letter, size, spacing, marginX, marginY, radius, color, font) {
    if (!letter) return;
    
    const x = marginX + col * (size + spacing) + size / 2;
    const y = marginY + row * (size + spacing) + size / 2;
    
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, x, y);
}

function convertTime(ms) {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    
    return parts.join(' ');
}