const axios = require('axios');

module.exports = {
  config: {
    name: "pickuplines",
    version: "1.0",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "Get a random pickup line"
    },
    longDescription: {
      en: "Fetches a random pickup line to charm someone"
    },
    category: "fun",
    guide: {
      en: "{pn}\nExample: {pn}"
    }
  },

  onStart: async function ({ message }) {
    try {
      const response = await axios({
        method: 'GET',
        url: 'https://kaiz-apis.gleeze.com/api/pickuplines?apikey=828c7c9b-3017-4647-b757-22853d6c9dd5',
        timeout: 15000
      });

      const data = response.data;
      const pickupLine = typeof data === 'string' ? data : data.pickupline || JSON.stringify(data);

      return message.reply(pickupLine);
    } catch (error) {
      console.error("Error in pickuplines command:", error);
      // Silently fail, no error message
    }
  }
};