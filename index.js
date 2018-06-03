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
const amplitude = require('./src/api/amplitude');

/* Utils ==================================================================== */

const sendTicker = (tickerObj, response, userId, isTwilio) => {
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
  amplitude.logEvent(userId, 'success_ticker', 'returned', ticker);
};

const sendUnicorn = (name, response, userId, isTwilio) => {
  const unicornObj = search.unicornJSON[name];

  const msg = `${unicornObj.proper_name}\nLast Val: ${unicornObj.latest_valuation}\nTotal Raised: ${unicornObj.total_equity_funding}\nLast Val Date: ${unicornObj.last_valuation_date}\nOwnership %: ${unicornObj.ownership_pct}\nBoard Member: ${unicornObj.board_member} ${unicornObj.crunchbase_link}`;
  const msgToSend = isTwilio ? twilioApi.respondSms(msg) : msg;
  amplitude.logEvent(userId, 'success_unicorn', 'returned', unicornObj.proper_name);
  response.status(200).send(msgToSend);
};

const sendUnicornList = (list, response, userId, isTwilio) => {
  const msg = `We found a few private unicorns: ${list.join(', ')}`;
  const msgToSend = isTwilio ? twilioApi.respondSms(msg) : msg;
  response.status(200).send(msgToSend);
  amplitude.logEvent(userId, 'searchResults_unicorns', 'returned', list.join(', '));
};

const processRequest = (request, response, userId, isTwilio) => {
  // fetch information from Yahoo
  if (request !== '') {
    Promise.all([
      yahooApi.requestTickerInfoNoReject(request),
      search.lookupPromiseNoReject(request, search.unicorns),
    ]).then((responseApis) => {
      const resultsTicker = responseApis[0];
      const resultsUnicorns = responseApis[1];

      // happy: only ticker
      if (resultsTicker && !resultsUnicorns) sendTicker(resultsTicker, response, userId, isTwilio);

      // happy: only 1 unicorn
      else if (
        resultsUnicorns
        && resultsUnicorns.length === 1
        && !resultsTicker
      ) sendUnicorn(resultsUnicorns[0], response, userId, isTwilio);

      // multiple unicorn search, whether ticker exists or not:
      else if (
        resultsUnicorns
        && resultsUnicorns.length > 1
        // && !resultsTicker
      ) sendUnicornList(resultsUnicorns, response, userId, isTwilio);

      // 1 ticker 1 unicorn
      else if (
        resultsTicker
        && resultsUnicorns
        && resultsUnicorns.length === 1
      ) {
        console.log(`${request} vs. ${resultsUnicorns[0]}`);
        if (request === resultsUnicorns[0]) {
          sendUnicorn(resultsUnicorns[0], response, userId, isTwilio);
        } else {
          sendTicker(resultsTicker, response, userId, isTwilio);
        }
      } else {
        const msg = `We didn't find a private company unicorn (or stock ticker) for "${request}"`;
        const msgToSend = isTwilio ? twilioApi.respondSms(msg) : msg;
        amplitude.logEvent(userId, 'failed_noResults', 'returned', request);
        response.send(msgToSend);
      }
    })
      .catch((err) => {
        console.log('ERROR!');
        const errToSend = isTwilio ? twilioApi.respondSms(err.message) : err.message;
        response.send(errToSend);
      });
  } else {
    const msgHelp = 'Enter the name of a private unicorn or stock Ticker';
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
  const request = req.query.ticker.toLowerCase().trim() || '';
  processRequest(request, res, 'web', false);
});

// Sms get request
app.post('/sms', (req, res) => {
  // collect response
  const { Body, From } = req.body;
  console.log('body', req.body);
  res.set('Content-Type', 'text/xml');
  processRequest(Body.toLowerCase().trim(), res, From, true);
  amplitude.logEvent(From, 'request_sms', 'request_body', Body.toLowerCase().trim());
});

// listening
app.listen(port, () => console.log(`Server running on port ${port}`));
