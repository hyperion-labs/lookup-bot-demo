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
const search = require('./src/search');

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
    Promise.all([
      yahooApi.requestTickerInfoNoReject(request),
      search.lookupPromiseNoReject(request, search.unicorns),
    ]).then((response) => {
      const resultsTicker = response[0];
      const resultsUnicorns = response[1];
      let results = [];

      // happy: only ticker
      if (resultsTicker && !resultsUnicorns) results = resultsTicker;

      // happy: only 1 unicorn
      else if (
        resultsUnicorns
        && resultsUnicorns.length === 1
        && !resultsTicker
      ) results = resultsUnicorns;

      // multiple unicorn search, whether ticker exists or not:
      else if (
        resultsUnicorns
        && resultsUnicorns.length > 1
        // && !resultsTicker
      ) results = resultsUnicorns;

      // 1 ticker 1 unicorn
      else if (
        resultsTicker
        && resultsUnicorns
        && resultsUnicorns.length === 1
      ) {
        if (request === resultsUnicorns[0]) {
          console.log('request and unicorn result are same');
          results = resultsUnicorns;
        } else {
          console.log('request and unicorn are not the same');
          results = resultsTicker;
        }
      }

      res.send(results);
    })
      .catch((err) => {
        console.log('ERROR!!');
        res.send(err.message);
      });
  } else {
    res.send('Enter a ticker in url (e.g. /quote?ticker="aapl")');
  }
});

// Sms get request
app.post('/sms', (req, res) => {
  // collect response
  const { Body } = req.body;
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
        const findingsMsg = `${name} (${ticker})\nLast: $${numeral(price).format('0,0.00')}\nMarketCap: $${numeral(marketCap).format('0.0a')}\nFwd P/E: ${numeral(fwdPe).format('0.0')}x ${yahooUrl}`;
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
