/* Variables ==================================================================== */

// libraries
const axios = require('axios');

// constants
const uri = 'https://query1.finance.yahoo.com/v7/finance';

/* api ==================================================================== */

const requestTickerInfo = (ticker) => {
  const tickerPromise = axios.get(`${uri}/quote`, {
    params: {
      symbols: ticker,
    },
  });

  return tickerPromise;
};

const getSummaryInfo = (response) => {
  const firstResult = response.data.quoteResponse.result[0];
  const stockData = {
    name: firstResult.shortName,
    ticker: firstResult.symbol,
    price: firstResult.regularMarketPrice,
    marketCap: firstResult.marketCap,
    fwdPe: firstResult.forwardPE,
    trailingPe: firstResult.trailingPE,
    yahooUrl: `https://finance.yahoo.com/quote/${firstResult.symbol}?p=${firstResult.symbol}`,
  };

  return stockData;
};

/* exports ==================================================================== */

module.exports = {
  requestTickerInfo,
  getSummaryInfo,
};
