/* Variables ==================================================================== */

// libraries
const axios = require('axios');

// constants
const api = process.env.AMPLITUDE_APIKEY;

/* API ==================================================================== */

const logEvent = (userId, eventType, eventKey, eventValue) => {
  if (eventKey) {
    axios.get('https://api.amplitude.com/httpapi', {
      params: {
        api_key: api,
        event: {
          user_id: `${userId}`,
          event_type: eventType,
          event_properties: {
            [eventKey]: eventValue,
          },
          ip: '$remote',
          time: new Date(),
        },
      },
    })
      .then(() => console.log('success'))
      .catch(err => console.log(`Error: ${err.message}`));
  } else {
    axios.get('https://api.amplitude.com/httpapi', {
      params: {
        api_key: api,
        event: {
          user_id: `${userId}`,
          event_type: eventType,
        },
        ip: '$remote',
        time: new Date(),
      },
    })
      .then(() => console.log('success'))
      .catch(err => console.log(`Error: ${err.message}`));
  }
};

/* Exports ==================================================================== */

module.exports = {
  logEvent,
};
