const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Chess engine implementation
class ChessGame {
    constructor(difficulty = 'normal') {
        this.difficulty = difficulty;
        this.board = this.createInitialBoard();
        this.currentPlayer = 'white';
        this.gameOver = false;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
    }

    createInitialBoard() {
        return [
            ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
            ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['', '', '', '', '', '', '', ''],
            ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
            ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
        ];
    }

    isValidMove(from, to) {
        const [fromX, fromY] = from;
        const [toX, toY] = to;
        const piece = this.board[fromY][fromX];
        const target = this.board[toY][toX];

        // Basic validation
        if (this.gameOver) return false;
        if (fromX < 0 || fromX > 7 || fromY < 0 || fromY > 7) return false;
        if (toX < 0 || toX > 7 || toY < 0 || toY > 7) return false;
        if (piece === '') return false;
        if ((this.currentPlayer === 'white' && piece === piece.toLowerCase()) ||
            (this.currentPlayer === 'black' && piece === piece.toUpperCase())) return false;
        if (target !== '' && 
            ((this.currentPlayer === 'white' && target === target.toUpperCase()) ||
             (this.currentPlayer === 'black' && target === target.toLowerCase()))) return false;

        // Piece movement rules
        return this.validatePieceMovement(from, to, piece, target);
    }

    validatePieceMovement(from, to, piece, target) {
        const [fromX, fromY] = from;
        const [toX, toY] = to;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Pawn movement
        if (piece.toLowerCase() === 'p') {
            const direction = piece === 'P' ? -1 : 1;
            const startRow = piece === 'P' ? 6 : 1;

            // Forward move
            if (dx === 0 && target === '') {
                // Single move forward
                if (dy === direction) return true;
                // Double move from starting position
                if (dy === 2 * direction && fromY === startRow && 
                    this.board[fromY + direction][fromX] === '') return true;
            }
            // Capture
            else if (absDx === 1 && dy === direction && target !== '') {
                return true;
            }
            return false;
        }
        // Rook movement
        else if (piece.toLowerCase() === 'r') {
            if (dx !== 0 && dy !== 0) return false;
            return this.checkStraightPath(from, to);
        }
        // Knight movement
        else if (piece.toLowerCase() === 'n') {
            return (absDx === 2 && absDy === 1) || (absDx === 1 && absDy === 2);
        }
        // Bishop movement
        else if (piece.toLowerCase() === 'b') {
            if (absDx !== absDy) return false;
            return this.checkDiagonalPath(from, to);
        }
        // Queen movement
        else if (piece.toLowerCase() === 'q') {
            if (absDx !== absDy && dx !== 0 && dy !== 0) return false;
            if (absDx === absDy) return this.checkDiagonalPath(from, to);
            return this.checkStraightPath(from, to);
        }
        // King movement
        else if (piece.toLowerCase() === 'k') {
            return absDx <= 1 && absDy <= 1;
        }
        return false;
    }

    checkStraightPath(from, to) {
        const [fromX, fromY] = from;
        const [toX, toY] = to;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
        const stepY = dy === 0 ? 0 : dy / Math.abs(dy);

        let x = fromX + stepX;
        let y = fromY + stepY;
        while (x !== toX || y !== toY) {
            if (this.board[y][x] !== '') return false;
            x += stepX;
            y += stepY;
        }
        return true;
    }

    checkDiagonalPath(from, to) {
        const [fromX, fromY] = from;
        const [toX, toY] = to;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const stepX = dx / Math.abs(dx);
        const stepY = dy / Math.abs(dy);

        let x = fromX + stepX;
        let y = fromY + stepY;
        while (x !== toX && y !== toY) {
            if (this.board[y][x] !== '') return false;
            x += stepX;
            y += stepY;
        }
        return true;
    }

    makeMove(from, to) {
        if (!this.isValidMove(from, to)) return false;

        const [fromX, fromY] = from;
        const [toX, toY] = to;
        const piece = this.board[fromY][fromX];
        const target = this.board[toY][toX];

        // Capture piece
        if (target !== '') {
            this.capturedPieces[this.currentPlayer].push(target);
        }

        // Move piece
        this.board[toY][toX] = piece;
        this.board[fromY][fromX] = '';

        // Record move
        const moveNotation = this.getMoveNotation(from, to, piece, target);
        this.moveHistory.push({
            player: this.currentPlayer,
            from, to,
            piece, target,
            notation: moveNotation
        });

        // Switch player
        this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';

        // Check for game over
        this.checkGameOver();

        return true;
    }

    getMoveNotation(from, to, piece, target) {
        const [fromX, fromY] = from;
        const [toX, toY] = to;
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const fromFile = files[fromX];
        const fromRank = 8 - fromY;
        const toFile = files[toX];
        const toRank = 8 - toY;

        let notation = '';
        if (piece.toLowerCase() !== 'p') {
            notation += piece.toUpperCase();
        }
        if (target !== '') {
            if (piece.toLowerCase() === 'p') {
                notation += fromFile;
            }
            notation += 'x';
        }
        notation += `${toFile}${toRank}`;
        return notation;
    }

    checkGameOver() {
        // Simple implementation - just check if kings are present
        let whiteKing = false;
        let blackKing = false;
        
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (this.board[y][x] === 'K') whiteKing = true;
                if (this.board[y][x] === 'k') blackKing = true;
            }
        }

        if (!whiteKing) {
            this.gameOver = true;
            this.winner = 'black';
        } else if (!blackKing) {
            this.gameOver = true;
            this.winner = 'white';
        }
    }

    getBotMove() {
        // Simple AI based on difficulty
        const validMoves = this.getAllValidMoves();
        if (validMoves.length === 0) return null;

        // Filter out obviously bad moves
        const sensibleMoves = validMoves.filter(move => {
            // Don't move to squares attacked by pawns
            const [toX, toY] = move.to;
            const piece = this.board[move.from[1]][move.from[0]];
            
            // Don't give away pieces for free
            if (this.board[toY][toX] !== '' && 
                this.getPieceValue(this.board[toY][toX]) < this.getPieceValue(piece)) {
                return false;
            }
            return true;
        });

        if (sensibleMoves.length === 0) return validMoves[0];

        // Difficulty-based move selection
        if (this.difficulty === 'easy') {
            // Random move from sensible moves
            return sensibleMoves[Math.floor(Math.random() * sensibleMoves.length)];
        } else if (this.difficulty === 'normal') {
            // Prefer captures and center control
            const scoredMoves = sensibleMoves.map(move => {
                let score = 0;
                const [toX, toY] = move.to;
                
                // Capture
                if (this.board[toY][toX] !== '') {
                    score += this.getPieceValue(this.board[toY][toX]) * 10;
                }
                
                // Center control
                if ((toX >= 3 && toX <= 4) && (toY >= 3 && toY <= 4)) {
                    score += 2;
                }
                
                return { move, score };
            });
            
            scoredMoves.sort((a, b) => b.score - a.score);
            return scoredMoves[0].move;
        } else { // hard
            // Look ahead 1 move
            const scoredMoves = sensibleMoves.map(move => {
                // Simulate move
                const originalBoard = JSON.parse(JSON.stringify(this.board));
                const originalPlayer = this.currentPlayer;
                
                this.makeMove(move.from, move.to);
                const opponentMoves = this.getAllValidMoves();
                
                // Evaluate position
                let score = this.evaluatePosition();
                
                // Undo move
                this.board = originalBoard;
                this.currentPlayer = originalPlayer;
                
                // Consider opponent's best response
                if (opponentMoves.length > 0) {
                    const opponentScores = opponentMoves.map(oppMove => {
                        const originalBoard2 = JSON.parse(JSON.stringify(this.board));
                        this.makeMove(oppMove.from, oppMove.to);
                        const oppScore = this.evaluatePosition();
                        this.board = originalBoard2;
                        return oppScore;
                    });
                    
                    const bestOpponentScore = Math.max(...opponentScores);
                    score -= bestOpponentScore * 0.5;
                }
                
                return { move, score };
            });
            
            scoredMoves.sort((a, b) => b.score - a.score);
            return scoredMoves[0].move;
        }
    }

    getAllValidMoves() {
        const moves = [];
        for (let fromY = 0; fromY < 8; fromY++) {
            for (let fromX = 0; fromX < 8; fromX++) {
                const piece = this.board[fromY][fromX];
                if (piece === '') continue;
                if ((this.currentPlayer === 'white' && piece === piece.toLowerCase()) ||
                    (this.currentPlayer === 'black' && piece === piece.toUpperCase())) continue;

                for (let toY = 0; toY < 8; toY++) {
                    for (let toX = 0; toX < 8; toX++) {
                        if (this.isValidMove([fromX, fromY], [toX, toY])) {
                            moves.push({
                                from: [fromX, fromY],
                                to: [toX, toY],
                                piece
                            });
                        }
                    }
                }
            }
        }
        return moves;
    }

    getPieceValue(piece) {
        const lowerPiece = piece.toLowerCase();
        switch (lowerPiece) {
            case 'p': return 1;
            case 'n': return 3;
            case 'b': return 3;
            case 'r': return 5;
            case 'q': return 9;
            case 'k': return 100;
            default: return 0;
        }
    }

    evaluatePosition() {
        let score = 0;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.board[y][x];
                if (piece === '') continue;
                
                const value = this.getPieceValue(piece);
                const isWhite = piece === piece.toUpperCase();
                
                // Material
                score += isWhite ? value : -value;
                
                // Piece-square tables (simple version)
                if (piece.toLowerCase() === 'p') {
                    // Pawns should advance
                    score += isWhite ? (7 - y) * 0.1 : y * 0.1;
                } else if (piece.toLowerCase() === 'n') {
                    // Knights prefer center
                    const centerScore = Math.min(x, 7 - x) + Math.min(y, 7 - y);
                    score += isWhite ? centerScore * 0.1 : -centerScore * 0.1;
                }
            }
        }
        return score;
    }
}

// Canvas rendering
function renderChessBoard(game) {
    const canvas = createCanvas(640, 640);
    const ctx = canvas.getContext('2d');

    // Draw board
    const squareSize = 80;
    const lightColor = '#f0d9b5';
    const darkColor = '#b58863';
    const highlightColor = 'rgba(255, 255, 0, 0.4)';
    const lastMoveColor = 'rgba(155, 199, 0, 0.4)';

    // Draw squares
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            ctx.fillStyle = (x + y) % 2 === 0 ? lightColor : darkColor;
            ctx.fillRect(x * squareSize, y * squareSize, squareSize, squareSize);
        }
    }

    // Highlight last move
    if (game.moveHistory.length > 0) {
        const lastMove = game.moveHistory[game.moveHistory.length - 1];
        ctx.fillStyle = lastMoveColor;
        ctx.fillRect(lastMove.from[0] * squareSize, lastMove.from[1] * squareSize, squareSize, squareSize);
        ctx.fillRect(lastMove.to[0] * squareSize, lastMove.to[1] * squareSize, squareSize, squareSize);
    }

    // Draw pieces
    const pieceImages = {
        'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
        'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
    };

    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const piece = game.board[y][x];
            if (piece !== '') {
                ctx.fillStyle = piece === piece.toUpperCase() ? '#ffffff' : '#000000';
                ctx.fillText(pieceImages[piece], x * squareSize + squareSize / 2, y * squareSize + squareSize / 2);
            }
        }
    }

    // Draw coordinates
    ctx.font = '16px Arial';
    ctx.fillStyle = '#000000';
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    for (let i = 0; i < 8; i++) {
        // Files (bottom)
        ctx.fillText(files[i], i * squareSize + squareSize / 2, 635);
        // Ranks (left)
        ctx.fillText(ranks[i], 10, i * squareSize + squareSize / 2);
    }

    // Draw game status
    if (game.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Game Over - ${game.winner} wins!`, canvas.width / 2, canvas.height / 2);
    } else {
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Current player: ${game.currentPlayer}`, 20, 30);
        ctx.fillText(`Difficulty: ${game.difficulty}`, 20, 60);
    }

    return canvas;
}

// Storage system
const chessDataPath = path.join(__dirname, 'chess_data.json');

function loadChessData() {
    try {
        if (fs.existsSync(chessDataPath)) {
            return JSON.parse(fs.readFileSync(chessDataPath, 'utf8'));
        }
        return [];
    } catch (err) {
        console.error('Error loading chess data:', err);
        return [];
    }
}

function saveChessData(data) {
    try {
        fs.writeFileSync(chessDataPath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error saving chess data:', err);
    }
}

module.exports = {
    config: {
        name: "chess",
        version: "1.0",
        author: "SajidMogged",
        countDown: 5,
        role: 0,
        description: { 
        en: "Play chess against the bot"
        },
        category: "game",
        guide: {
            en: "  {pn} [easy | normal | hard]: start a new game with specified difficulty (default normal)\n"
                + "  Example:\n"
                + "    {pn}\n"
                + "    {pn} hard\n\n"
                + "  How to play:\n"
                + "  - Reply to the bot's message with your move in algebraic notation (e.g. e2e4, Nf3, g1f3)\n"
                + "  - The bot will respond with its move\n\n"
                + "  {pn} top: view the top 10 players\n"
                + "  {pn} info [<uid> | <@tag> | <reply> | <empty>]: view player stats\n"
                + "  {pn} reset: reset the leaderboard (admin only)"
        }
    },

    langs: {
        en: {
            charts: "🏆 | Top 10 Chess Players:\n%1",
            noScore: "⭕ | No players have scored yet.",
            noPermissionReset: "⚠️ | You don't have permission to reset the leaderboard.",
            notFoundUser: "⚠️ | Player with ID %1 not found.",
            userRankInfo: "🏆 | Player Stats:\nName: %1\nScore: %2\nGames Played: %3\nWins: %4\nLosses: %5\nWin Rate: %6%\nTotal Play Time: %7",
            resetRankSuccess: "✅ | Leaderboard reset successfully.",
            invalidDifficulty: "⚠️ | Please choose difficulty (easy, normal or hard)",
            created: "✅ | Chess game started! Difficulty: %1\nYou play as white. Make your first move (e.g. e2e4, Nf3).",
            invalidMove: "⚠️ | Invalid move. Please use algebraic notation (e.g. e2e4, Nf3, g1f3)",
            yourMove: "✅ | Your move: %1",
            botMove: "🤖 | Bot moves: %1",
            win: "🎉 | You won! Congratulations!",
            loss: "🤦‍♂️ | You lost. Better luck next time!",
            draw: "🤝 | Game ended in a draw."
        }
    },

    onStart: async function ({ message, event, getLang, commandName, args, usersData, role }) {
        if (args[0] === "top") {
            const chessData = loadChessData();
            if (!chessData.length)
                return message.reply(getLang("noScore"));

            // Sort by wins (descending) then by points (descending)
            const sortedPlayers = [...chessData].sort((a, b) => {
                const aWins = a.wins || 0;
                const bWins = b.wins || 0;
                if (bWins !== aWins) return bWins - aWins;
                return b.points - a.points;
            }).slice(0, 10);

            const medals = ["🥇", "🥈", "🥉"];
            const topPlayersText = await Promise.all(sortedPlayers.map(async (item, index) => {
                const userName = await usersData.getName(item.id);
                const wins = item.wins || 0;
                const losses = item.losses || 0;
                const medal = medals[index] || `#${index + 1}`;
                return `${medal} ${userName} - ${wins} wins - ${losses} losses - ${item.points} pts`;
            }));

            return message.reply(getLang("charts", topPlayersText.join("\n")));
        }
        else if (args[0] === "info") {
            const chessData = loadChessData();
            let targetID;
            if (Object.keys(event.mentions).length)
                targetID = Object.keys(event.mentions)[0];
            else if (event.messageReply)
                targetID = event.messageReply.senderID;
            else if (!isNaN(args[1]))
                targetID = args[1];
            else
                targetID = event.senderID;

            const userData = chessData.find(item => item.id == targetID);
            if (!userData)
                return message.reply(getLang("notFoundUser", targetID));

            const userName = await usersData.getName(targetID);
            const pointsReceived = userData.points || 0;
            const winNumber = userData.wins || 0;
            const lossNumber = userData.losses || 0;
            const playNumber = winNumber + lossNumber;
            const winRate = playNumber > 0 ? ((winNumber / playNumber) * 100).toFixed(2) : "0";
            const playTime = convertTime(userData.playTime || 0);
            
            return message.reply(getLang("userRankInfo", 
                userName, 
                pointsReceived, 
                playNumber, 
                winNumber, 
                lossNumber, 
                winRate, 
                playTime));
        }
        else if (args[0] === "reset") {
            if (role < 2)
                return message.reply(getLang("noPermissionReset"));
            saveChessData([]);
            return message.reply(getLang("resetRankSuccess"));
        }

        // Start a new game
        const difficulty = args[0] || 'normal';
        if (!['easy', 'normal', 'hard'].includes(difficulty))
            return message.reply(getLang("invalidDifficulty"));

        const chessGame = new ChessGame(difficulty);
        const canvas = renderChessBoard(chessGame);
        const imageStream = canvas.createPNGStream();
        imageStream.path = `chess_${Date.now()}.png`;

        const messageData = message.reply(getLang("created", difficulty));
        
        message.reply({
            attachment: imageStream
        }, (err, info) => {
            global.GoatBot.onReply.set(info.messageID, {
                commandName,
                messageID: info.messageID,
                author: event.senderID,
                chessGame,
                messageData
            });
        });
    },

    onReply: async ({ message, Reply, event, getLang, commandName }) => {
        const { chessGame, messageData } = Reply;
        if (event.senderID != Reply.author)
            return;

        if (chessGame.gameOver) {
            global.GoatBot.onReply.delete(Reply.messageID);
            return message.reply("This game is already over. Start a new one with /chess");
        }

        const moveInput = (event.body || "").trim();
        let from, to;

        // Parse move in coordinate notation (e2e4)
        if (/^[a-h][1-8][a-h][1-8]$/.test(moveInput)) {
            const fileToX = { 'a':0, 'b':1, 'c':2, 'd':3, 'e':4, 'f':5, 'g':6, 'h':7 };
            from = [fileToX[moveInput[0]], 8 - parseInt(moveInput[1])];
            to = [fileToX[moveInput[2]], 8 - parseInt(moveInput[3])];
        }
        // Parse move in algebraic notation (Nf3)
        else if (/^[KQRNB]?[a-h]?[1-8]?x?[a-h][1-8](=[QRNB])?[+#]?$/.test(moveInput)) {
            // Simplified parsing - for full implementation would need more complex logic
            const fileToX = { 'a':0, 'b':1, 'c':2, 'd':3, 'e':4, 'f':5, 'g':6, 'h':7 };
            const toFile = moveInput[moveInput.length - 2];
            const toRank = moveInput[moveInput.length - 1];
            to = [fileToX[toFile], 8 - parseInt(toRank)];
            
            // This is simplified - proper algebraic notation parsing would need more work
            from = this.findPieceForMove(chessGame, moveInput, to);
            if (!from) {
                return message.reply(getLang("invalidMove"));
            }
        } else {
            return message.reply(getLang("invalidMove"));
        }

        // Make player move
        if (!chessGame.makeMove(from, to)) {
            return message.reply(getLang("invalidMove"));
        }

        const playerMoveNotation = chessGame.moveHistory[chessGame.moveHistory.length - 1].notation;
        
        // Check if game over after player move
        if (chessGame.gameOver) {
            global.GoatBot.onReply.delete(Reply.messageID);
            const chessData = loadChessData();
            
            // Update player stats
            const userIndex = chessData.findIndex(item => item.id == event.senderID);
            if (userIndex === -1) {
                chessData.push({
                    id: event.senderID,
                    wins: 1,
                    losses: 0,
                    points: chessGame.difficulty === 'easy' ? 1 : 
                           chessGame.difficulty === 'normal' ? 2 : 3,
                    playTime: Date.now() - chessGame.timeStart
                });
            } else {
                chessData[userIndex].wins = (chessData[userIndex].wins || 0) + 1;
                chessData[userIndex].points += chessGame.difficulty === 'easy' ? 1 : 
                                              chessGame.difficulty === 'normal' ? 2 : 3;
                chessData[userIndex].playTime = (chessData[userIndex].playTime || 0) + 
                                              (Date.now() - chessGame.timeStart);
            }
            saveChessData(chessData);
            
            const canvas = renderChessBoard(chessGame);
            const imageStream = canvas.createPNGStream();
            imageStream.path = `chess_${Date.now()}.png`;
            
            message.unsend((await messageData).messageID);
            message.unsend(Reply.messageID);
            return message.reply({
                body: getLang("win"),
                attachment: imageStream
            });
        }

        // Bot makes move
        const botMove = chessGame.getBotMove();
        if (!botMove) {
            // No valid moves - stalemate or checkmate
            chessGame.gameOver = true;
            chessGame.winner = 'draw';
            
            global.GoatBot.onReply.delete(Reply.messageID);
            const canvas = renderChessBoard(chessGame);
            const imageStream = canvas.createPNGStream();
            imageStream.path = `chess_${Date.now()}.png`;
            
            message.unsend((await messageData).messageID);
            message.unsend(Reply.messageID);
            return message.reply({
                body: getLang("draw"),
                attachment: imageStream
            });
        }

        chessGame.makeMove(botMove.from, botMove.to);
        const botMoveNotation = chessGame.moveHistory[chessGame.moveHistory.length - 1].notation;

        // Check if game over after bot move
        if (chessGame.gameOver) {
            global.GoatBot.onReply.delete(Reply.messageID);
            const chessData = loadChessData();
            
            // Update player stats
            const userIndex = chessData.findIndex(item => item.id == event.senderID);
            if (userIndex === -1) {
                chessData.push({
                    id: event.senderID,
                    wins: 0,
                    losses: 1,
                    points: 0,
                    playTime: Date.now() - chessGame.timeStart
                });
            } else {
                chessData[userIndex].losses = (chessData[userIndex].losses || 0) + 1;
                chessData[userIndex].playTime = (chessData[userIndex].playTime || 0) + 
                                              (Date.now() - chessGame.timeStart);
            }
            saveChessData(chessData);
            
            const canvas = renderChessBoard(chessGame);
            const imageStream = canvas.createPNGStream();
            imageStream.path = `chess_${Date.now()}.png`;
            
            message.unsend((await messageData).messageID);
            message.unsend(Reply.messageID);
            return message.reply({
                body: getLang("loss"),
                attachment: imageStream
            });
        }

        // Continue game
        const canvas = renderChessBoard(chessGame);
        const imageStream = canvas.createPNGStream();
        imageStream.path = `chess_${Date.now()}.png`;

        message.reply({
            body: `${getLang("yourMove", playerMoveNotation)}\n${getLang("botMove", botMoveNotation)}`,
            attachment: imageStream
        }, (err, info) => {
            message.unsend(Reply.messageID);
            global.GoatBot.onReply.set(info.messageID, {
                commandName,
                messageID: info.messageID,
                author: event.senderID,
                chessGame,
                messageData
            });
        });
    },

    findPieceForMove(game, moveInput, to) {
        // Simplified piece finding - would need more complex logic for full algebraic notation
        const pieceType = moveInput[0].toLowerCase();
        const files = { 'a':0, 'b':1, 'c':2, 'd':3, 'e':4, 'f':5, 'g':6, 'h':7 };
        
        // Find all pieces of the right type that can move to the target square
        const possiblePieces = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = game.board[y][x];
                if (piece !== '' && 
                    piece.toLowerCase() === pieceType &&
                    game.isValidMove([x, y], to)) {
                    possiblePieces.push([x, y]);
                }
            }
        }
        
        if (possiblePieces.length === 1) {
            return possiblePieces[0];
        }
        
        // If multiple pieces can move there, try to disambiguate
        if (possiblePieces.length > 1) {
            // Check if move input specifies file or rank
            if (moveInput.length >= 3) {
                const disambig = moveInput[1];
                if (files[disambig] !== undefined) {
                    // File specified
                    const x = files[disambig];
                    return possiblePieces.find(p => p[0] === x);
                } else if (!isNaN(disambig)) {
                    // Rank specified
                    const y = 8 - parseInt(disambig);
                    return possiblePieces.find(p => p[1] === y);
                }
            }
        }
        
        return null;
    }
};

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