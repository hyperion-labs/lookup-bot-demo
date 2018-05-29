/* Variables ==================================================================== */

// constants
const port = process.env.PORT || 3000;

// libraries
const express = require('express');
const bodyParser = require('body-parser');

// custom modules
const yahooApi = require('./src/api/yahoo');

/* Server ==================================================================== */

// create server
const app = express();

// middleware
app.use(bodyParser.urlencoded({ extended: false }));

// Root get request
app.get('/*', (req, res) => {
  // extract request from URL
  const request = req.query.ticker || '';

  // fetch information from Yahoo
  if (request !== '') {
    yahooApi.requestTickerInfo(request)
      .then((response) => {
        if (response.status !== 200) {
          throw new Error(`No ticker found for ${request}`);
        } else {
          res.send(yahooApi.getSummaryInfo(response));
        }
        // console.log(JSON.stringify(res.data, undefined, 2));
      })
      .catch((err) => {
        let message = `ERROR: ${err.message}`;
        if (err.response.status === 404 || err.response.status === 400) {
          message = `Unable to find information for ticker "${request}."`;
        }
        res.send(message);
      });
  } else {
    res.send('Enter a ticker in url (e.g. /?quote="aapl")');
  }
});

// listening
app.listen(port, () => console.log(`Server running on port ${port}`));
