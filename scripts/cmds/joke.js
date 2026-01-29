const axios = require('axios');

module.exports = {
  config: {
    name: "joke",
    version: "1.0",
    author: "SajidMogged",
    countDown: 5,
    role: 0,
    shortDescription: {
      en: "get a random joke"
    },
    longDescription: {
      en: "Fetches a random joke to make you laugh"
    },
    category: "fun",
    guide: {
      en: " {pn}\nExample: {pn}"
    }
  },

  onStart: async function ({ message }) {
    try {
      const response = await axios({
        method: 'GET',
        url: 'https://kaiz-apis.gleeze.com/api/joke?apikey=828c7c9b-3017-4647-b757-22853d6c9dd5',
        timeout: 15000
      });

      const data = response.data;
      const joke = typeof data === 'string' ? data : data.joke || JSON.stringify(data);

      return message.reply(joke);
    } catch (error) {
      console.error("Error in joke command:", error);
      // Silently fail, no error message
    }
  }
};