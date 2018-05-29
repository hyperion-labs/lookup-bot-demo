/* Variables ==================================================================== */

// constants
const port = process.env.PORT || 3000;

// libraries
const express = require('express');
const bodyParser = require('body-parser');
const numeral = require('numeral');

// custom modules
const yahooApi = require('./src/api/yahoo');
const twilioApi = require('./src/api/twilio');

/* Server ==================================================================== */

// create server
const app = express();

// middleware
app.use(bodyParser.urlencoded({ extended: false }));

// root get requet
app.get('/', (req, res) => {
  res.send('Hello world!');
});

// Quote get request
app.get('/quote', (req, res) => {
  // extract request from URL
  const request = req.query.ticker || '';

  // fetch information from Yahoo
  if (request !== '') {
    yahooApi.requestTickerInfo(request)
      .then((response) => {
        if (response.status !== 200) {
          throw new Error(`No stock found for ticker ${request}`);
        } else {
          res.status(200).send(yahooApi.getSummaryInfo(response));
        }
        // console.log(JSON.stringify(res.data, undefined, 2));
      })
      .catch((err) => {
        let message = `ERROR: ${err.message}`;
        if (err.response.status === 404 || err.response.status === 400) {
          message = `No stock found for ticker "${request}."`;
        }
        res.status(err.response.status).send(message);
      });
  } else {
    res.send('Enter a ticker in url (e.g. /quote?ticker="aapl")');
  }
});

// Sms get request
app.post('/sms', (req, res) => {
  // collect response
  const { From, FromCountry, Body } = req.body;
  res.set('Content-Type', 'text/xml');

  // do a lookup to Yahoo query
  yahooApi.requestTickerInfo(Body)
    .then((responseYahoo) => {
      if (responseYahoo.status !== 200) {
        throw new Error(`No stock found for ticker ${Body}`);
      } else {
        const findingsObj = yahooApi.getSummaryInfo(responseYahoo);
        const {
          name,
          ticker,
          price,
          marketCap,
          fwdPe,
          yahooUrl,
        } = findingsObj;
        const findingsMsg = `${name} (${ticker})\nLast: $${numeral(price).format('0,0.00')}\nMarketCap: $${numeral(marketCap).format('0.0a')}\nFwd P/E: ${numeral(fwdPe).format('0.0')}x${yahooUrl}`;
        res.status(200).send(twilioApi.respondSms(findingsMsg));
      }
    })
    .catch((err) => {
      let message = `ERROR: ${err.message}`;
      if (err.response.status === 404 || err.response.status === 400) {
        message = `No stock found for ticker "${Body}."`;
      }
      res.status(200).send(twilioApi.respondSms(message));
    });
});

// listening
app.listen(port, () => console.log(`Server running on port ${port}`));
