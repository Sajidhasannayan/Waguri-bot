const axios = require('axios');
const fs = require('fs');
const path = require('path');

const autoDownloadStates = new Map();
const downloadQueue = new Map();
const userDownloadLimits = new Map();

const supportedPlatforms = {
    youtube: /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu\.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/,
    facebook: /^(https?:\/\/)?(www\.)?(facebook|fb)\.(com|watch)\/.*$/,
    instagram: /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\/(?:p|reel)\/([A-Za-z0-9\-_]+)/,
    tiktok: /^(https?:\/\/)?(www\.)?(tiktok\.com)\/.*\/video\/(\d+)/,
    twitter: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/
};

const HOURLY_LIMIT = 25;
const GROUP_SETTINGS_FILE = 'group_download_settings.json';

function loadGroupSettings() {
    try {
        if (fs.existsSync(GROUP_SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(GROUP_SETTINGS_FILE, 'utf8'));
        }
    } catch (error) {}
    return {};
}

function saveGroupSettings(settings) {
    fs.writeFileSync(GROUP_SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = userDownloadLimits.get(userId) || { count: 0, timestamp: now };

    if (now - userLimit.timestamp > 3600000) {
        userDownloadLimits.set(userId, { count: 1, timestamp: now });
        return true;
    }

    if (userLimit.count >= HOURLY_LIMIT) return false;

    userLimit.count++;
    userDownloadLimits.set(userId, userLimit);
    return true;
}

function extractValidUrls(text) {
    const urls = [];
    for (const [platform, regex] of Object.entries(supportedPlatforms)) {
        const matches = text.matchAll(new RegExp(regex, 'g'));
        for (const match of matches) {
            urls.push({ url: match[0], platform });
        }
    }
    return urls;
}

async function getVideoData(url) {
    try {
        const encodedUrl = encodeURIComponent(url);
        const response = await axios.get(`https://dev-priyanshi.onrender.com/api/alldl?url=${encodedUrl}`, {
            timeout: 30000, // 30 second timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.data.status || !response.data.data) {
            throw new Error('Invalid API response');
        }

        const data = response.data.data;
        
        // Always prefer high quality, fallback to low if high not available
        const downloadUrl = data.high || data.low;
        
        if (!downloadUrl) {
            throw new Error('No download URL found');
        }

        return {
            title: data.title || 'Video',
            thumbnail: data.thumbnail,
            downloadUrl: downloadUrl,
            quality: data.high ? 'High' : 'Low'
        };
    } catch (error) {
        throw new Error(`Failed to get video data: ${error.message}`);
    }
}

async function downloadVideo(videoData, api, event) {
    try {
        const videoPath = path.join(__dirname, `temp_video_${event.threadID}_${Date.now()}.mp4`);

        const videoResponse = await axios({
            url: videoData.downloadUrl,
            method: 'GET',
            responseType: 'stream',
            timeout: 60000, // 60 second timeout for download
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const writer = fs.createWriteStream(videoPath);
        videoResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(videoPath));
            writer.on('error', reject);
            
            // Add timeout for write operation
            setTimeout(() => {
                writer.destroy();
                reject(new Error('Download timeout'));
            }, 120000); // 2 minute timeout
        });
    } catch (error) {
        throw new Error(`Download failed: ${error.message}`);
    }
}

module.exports = {
    config: {
        name: "autolink",
        version: "3.0",
        author: "Priyanshi Kaur",
        countDown: 5,
        role: 0,
        shortDescription: "Auto video downloader",
        longDescription: "Automatically detects and downloads videos from supported platforms with high quality",
        category: "Media",
        guide: {
            en: "{prefix}autolink on/off/status - Enable/disable auto download or check status"
        }
    },

    onStart: async function ({ api, args, message, event }) {
        const threadID = event.threadID;
        const settings = loadGroupSettings();

        if (!args[0] || !['on', 'off', 'status'].includes(args[0].toLowerCase())) {
            return message.reply(
                "📱 Autolink Commands:\n" +
                "• `autolink on` - Enable auto download\n" +
                "• `autolink off` - Disable auto download\n" +
                "• `autolink status` - Check current status\n\n" +
                "🎥 Supported platforms: " + Object.keys(supportedPlatforms).join(', ')
            );
        }

        const command = args[0].toLowerCase();

        if (command === 'status') {
            const status = settings[threadID] ? 'enabled' : 'disabled';
            const limits = userDownloadLimits.get(event.senderID) || { count: 0 };
            const resetTime = new Date(Date.now() + 3600000).toLocaleTimeString();
            
            return message.reply(
                `📊 Auto Download Status:\n` +
                `➤ Current state: ${status}\n` +
                `➤ Your downloads: ${limits.count}/${HOURLY_LIMIT} (resets at ${resetTime})\n` +
                `➤ Quality: High (when available)\n` +
                `➤ Supported: ${Object.keys(supportedPlatforms).join(', ')}\n\n` +
                `💡 Just send any supported video link to auto-download!`
            );
        }

        settings[threadID] = command === 'on';
        saveGroupSettings(settings);

        const statusEmoji = command === 'on' ? '✅' : '❌';
        const statusText = command === 'on' ? 'enabled' : 'disabled';
        
        return message.reply(
            `${statusEmoji} Auto download ${statusText} for this chat!\n\n` +
            (command === 'on' ? 
                `🎯 Send any video link from: ${Object.keys(supportedPlatforms).join(', ')}\n` +
                `⚡ Downloads will be in high quality automatically!` :
                `💤 Auto download is now disabled.`
            )
        );
    },

    onChat: async function ({ api, message, event }) {
        const settings = loadGroupSettings();
        if (!settings[event.threadID]) return;

        const text = event.body || '';
        const urls = extractValidUrls(text);

        if (urls.length === 0) return;

        // Check rate limit
        if (!checkRateLimit(event.senderID)) {
            const resetTime = new Date(Date.now() + 3600000).toLocaleTimeString();
            return message.reply(
                `⚠️ Rate limit reached!\n` +
                `➤ Limit: ${HOURLY_LIMIT} downloads per hour\n` +
                `➤ Resets at: ${resetTime}\n\n` +
                `💡 This prevents API abuse and ensures service stability.`
            );
        }

        // Process each URL found
        for (const { url, platform } of urls) {
            const threadQueue = downloadQueue.get(event.threadID) || new Set();

            // Skip if already processing this URL
            if (threadQueue.has(url)) continue;
            threadQueue.add(url);
            downloadQueue.set(event.threadID, threadQueue);

            try {
                // Show processing reaction
                api.setMessageReaction("⏳", event.messageID, () => {}, true);

                // Get video metadata and download URL
                const videoData = await getVideoData(url);
                
                // Download the video
                const videoPath = await downloadVideo(videoData, api, event);

                // Prepare message with video info
                const messageBody = 
                    `🎥 Auto-Downloaded Video\n` +
                    `➤ Platform: ${platform.charAt(0).toUpperCase() + platform.slice(1)}\n` +
                    `➤ Title: ${videoData.title}\n` +
                    `➤ Quality: ${videoData.quality}\n` +
                    `➤ Original: ${url}`;

                // Send video with metadata
                await api.sendMessage(
                    {
                        body: messageBody,
                        attachment: fs.createReadStream(videoPath)
                    },
                    event.threadID,
                    (err, info) => {
                        // Cleanup
                        try {
                            fs.unlinkSync(videoPath);
                        } catch (cleanupError) {
                            console.error('Cleanup error:', cleanupError);
                        }
                        
                        threadQueue.delete(url);
                        
                        if (!err) {
                            api.setMessageReaction("✅", event.messageID, () => {}, true);
                        } else {
                            api.setMessageReaction("❌", event.messageID, () => {}, true);
                        }
                    }
                );

            } catch (error) {
                console.error(`Download error for ${url}:`, error.message);
                
                // Clean up queue and show error
                threadQueue.delete(url);
                api.setMessageReaction("❌", event.messageID, () => {}, true);
                
                // Send error message (optional, can be removed to avoid spam)
                message.reply(
                    `❌ Download failed for ${platform}\n` +
                    `➤ Error: ${error.message}\n` +
                    `➤ URL: ${url}\n\n` +
                    `💡 This might be due to: private content, expired link, or API issues.`
                );
            }
        }
    }
};