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

/* Utils ==================================================================== */

const sendTicker = (tickerObj, response, isTwilio) => {
  const {
    name,
    ticker,
    price,
    marketCap,
    fwdPe,
    yahooUrl,
  } = tickerObj;
  const msg = `${name} (${ticker})\nLast: $${numeral(price).format('0,0.00')}\nMarketCap: $${numeral(marketCap).format('0.0a')}\nFwd P/E: ${numeral(fwdPe).format('0.0')}x ${yahooUrl}`;
  const msgToSend = isTwilio ? twilioApi.respondSms(msg) : msg;
  response.status(200).send(msgToSend);
};

const sendUnicorn = (name, response, isTwilio) => {
  const unicornObj = search.unicornJSON[name];

  const msg = `${unicornObj.proper_name}\nLast Val: ${unicornObj.latest_valuation}\nTotal Raised: ${unicornObj.total_equity_funding}\nLast Val Date: ${unicornObj.last_valuation_date}\nOwnership %: ${unicornObj.ownership_pct}\nBoard Member: ${unicornObj.board_member}`;
  const msgToSend = isTwilio ? twilioApi.respondSms(msg) : msg;
  response.status(200).send(msgToSend);
};

const sendUnicornList = (list, response, isTwilio) => {
  const msg = `We found a few companies: ${list.join(', ')}`;
  const msgToSend = isTwilio ? twilioApi.respondSms(msg) : msg;
  response.status(200).send(msgToSend);
};

const processRequest = (request, response, isTwilio) => {
  // fetch information from Yahoo
  if (request !== '') {
    Promise.all([
      yahooApi.requestTickerInfoNoReject(request),
      search.lookupPromiseNoReject(request, search.unicorns),
    ]).then((responseApis) => {
      const resultsTicker = responseApis[0];
      const resultsUnicorns = responseApis[1];

      // happy: only ticker
      if (resultsTicker && !resultsUnicorns) sendTicker(resultsTicker, response, isTwilio);

      // happy: only 1 unicorn
      else if (
        resultsUnicorns
        && resultsUnicorns.length === 1
        && !resultsTicker
      ) sendUnicorn(resultsUnicorns[0], response, isTwilio);

      // multiple unicorn search, whether ticker exists or not:
      else if (
        resultsUnicorns
        && resultsUnicorns.length > 1
        // && !resultsTicker
      ) sendUnicornList(resultsUnicorns, response, isTwilio);

      // 1 ticker 1 unicorn
      else if (
        resultsTicker
        && resultsUnicorns
        && resultsUnicorns.length === 1
      ) {
        console.log(`${request} vs. ${resultsUnicorns[0]}`);
        if (request === resultsUnicorns[0]) {
          console.log('request and unicorn result are same');
          sendUnicorn(resultsUnicorns[0], response, isTwilio);
        } else {
          console.log('request and unicorn are not the same');
          sendTicker(resultsTicker, response, isTwilio);
        }
      } else {
        const msg = `We didn't find a ticker or private company unicorn "${request}"`;
        const msgToSend = isTwilio ? twilioApi.respondSms(msg) : msg;
        response.send(msgToSend);
      }
    })
      .catch((err) => {
        console.log('ERROR!');
        const errToSend = isTwilio ? twilioApi.respondSms(err.message) : err.message;
        response.send(errToSend);
      });
  } else {
    const msgHelp = 'Enter a ticker in url (e.g. /quote?ticker="aapl")';
    const msgHelpToSend = isTwilio ? twilioApi.respondSms(msgHelp) : msgHelp;
    response.send(msgHelpToSend);
  }
};

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
  processRequest(request, res, false);
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
        const findingsObj = yahooApi.getTickerInfo(responseYahoo);
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
