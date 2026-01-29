const axios = require('axios');

module.exports = {
  config: {
    name: "catfact",
    version: "1.0",
    author: "SajidMogged",
    countDown: 10,
    role: 0,
    shortDescription: {
      en: "Get a random cat fact"
    },
    longDescription: {
      en: "Fetches an interesting random fact about cats"
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
        url: 'https://kaiz-apis.gleeze.com/api/catfact?apikey=770f0df0-f042-4c9f-8e38-b25635565839',
        timeout: 15000
      });

      const data = response.data;
      const catFact = typeof data === 'string' ? data : data.fact || JSON.stringify(data);

      return message.reply(catFact);
    } catch (error) {
      console.error("Error in catfact command:", error);
      // Silently fail, no error message
    }
  }
};