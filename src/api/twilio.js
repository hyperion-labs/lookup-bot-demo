/* Variables ==================================================================== */

// constants
const accountSid = process.env.TWILIO_ACCOUNTSID_TOY;
const authToken = process.env.TWILIO_AUTH_TOKEN_TOY;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER_TOY;

// libraries
const client = require('twilio')(accountSid, authToken);
const { MessagingResponse } = require('twilio').twiml;

/* API ==================================================================== */

// sending an SMS
const sendSms = (body, to = '+17138825400') => {
  console.log(`sending message to ${to}: ${body}`);
  client.messages
    .create({
      body,
      from: twilioPhoneNumber,
      to,
    })
    .then(message => console.log(message.sid))
    .catch(err => console.log(err.message))
    .done();
};

/* Exports ==================================================================== */

module.exports = {
  sendSms,
};
