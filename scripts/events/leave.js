const { getTime } = global.utils;
const { getLeaveAttachment } = require("../cmds/setleave.js"); // Correct path based on your structure
const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "leave",
    version: "1.4",
    author: "SajidMogged",
    category: "events"
  },

  langs: {
    vi: {
      session1: "sáng",
      session2: "trưa",
      session3: "chiều",
      session4: "tối",
      leaveType1: "tự rời",
      leaveType2: "bị kick",
      defaultLeaveMessage: "{userName} đã {type} khỏi nhóm"
    },
    en: {
      session1: "morning",
      session2: "noon",
      session3: "afternoon",
      session4: "evening",
      leaveType1: "left",
      leaveType2: "was kicked from",
      defaultLeaveMessage: "{userName} {type} the group"
    }
  },

  onStart: async ({ threadsData, message, event, api, usersData, getLang }) => {
    if (event.logMessageType !== "log:unsubscribe") return;

    const { threadID } = event;
    const threadData = await threadsData.get(threadID);
    if (!threadData?.settings?.sendLeaveMessage) return;

    const { leftParticipantFbId } = event.logMessageData;
    if (leftParticipantFbId == api.getCurrentUserID()) return;

    const hours = getTime("HH");
    const threadName = threadData.threadName;
    const userName = await usersData.getName(leftParticipantFbId);

    let { leaveMessage = getLang("defaultLeaveMessage") } = threadData.data;
    const form = {
      mentions: leaveMessage.includes("{userNameTag}") ? [{
        tag: userName,
        id: leftParticipantFbId
      }] : null
    };

    leaveMessage = leaveMessage
      .replace(/\{userName\}|\{userNameTag\}/g, userName)
      .replace(/\{type\}/g, leftParticipantFbId == event.author ? getLang("leaveType1") : getLang("leaveType2"))
      .replace(/\{threadName\}|\{boxName\}/g, threadName)
      .replace(/\{time\}/g, hours)
      .replace(/\{session\}/g,
        hours <= 10 ? getLang("session1") :
        hours <= 12 ? getLang("session2") :
        hours <= 18 ? getLang("session3") :
        getLang("session4")
      );

    form.body = leaveMessage;

    // Get custom leave image/audio/video
    const attachmentData = await getLeaveAttachment(threadID);
    if (attachmentData?.url) {
      try {
        const stream = await getStreamFromURL(attachmentData.url);
        if (stream) form.attachment = [stream];
      } catch (err) {
        console.error("Failed to load leave attachment:", err);
      }
    }

    message.send(form);
  }
};