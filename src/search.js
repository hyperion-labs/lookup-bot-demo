/* Variables ==================================================================== */

// libraries
const fs = require('fs');
const _ = require('lodash');

// custom modules
const unicornJSON = JSON.parse(fs.readFileSync('./src/assets/unicorns_keyed.json', 'utf8'));
const unicorns = Object.keys(unicornJSON).map(co => co.toLowerCase());

// resources
// https://jsperf.com/levenshtein123456

/* Utilities ==================================================================== */

const getUnicornInfo = name => unicorns[name];


/* Algorithms ==================================================================== */

const levenshteinA = (paramA, paramB) => {
  let a = paramA;
  let b = paramB;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let tmp;
  let i;
  let j;
  let prev;
  let val;

  // swap to save some memory O(min(a,b)) instead of O(a)
  if (a.length > b.length) {
    tmp = a;
    a = b;
    b = tmp;
  }

  const row = Array(a.length + 1);
  // init the row
  for (i = 0; i <= a.length; i++) {
    row[i] = i;
  }

  // fill in the rest
  for (i = 1; i <= b.length; i++) {
    prev = i;
    for (j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        val = row[j - 1]; // match
      } else {
        val = Math.min(
          row[j - 1] + 1, // substitution
          Math.min(
            prev + 1, // insertion
            row[j] + 1, // deletion
          ),
        );
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[a.length] = prev;
  }
  return row[a.length];
};

const levenshteinB = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // increment along the first column of each row
  let i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  let j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1, // deletion
          ),
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const alphaSearch = (pattern, searchArray) => {
  const re = new RegExp(`^${pattern}`);
  return searchArray.filter(elem => re.exec(elem));
};

/* Search Function ==================================================================== */
const lookup = (searchTerm, list) => {
  // Perform levenshtein and save results
  let levenshteinLimit = 0;
  if (searchTerm.length === 3) levenshteinLimit = 1;
  if (searchTerm.length >= 4 && searchTerm.length <= 10) levenshteinLimit = 2;
  if (searchTerm.length > 10) levenshteinLimit = 3;

  const levenshteinResults = {};
  for (let i = 0; i <= levenshteinLimit; i++) {
    levenshteinResults[i] = [];
  }

  list.reduce((accObj, co) => {
    const levenshteinDistance = levenshteinA(searchTerm, co);
    if (levenshteinDistance <= levenshteinLimit) {
      accObj[levenshteinDistance].push(co);
    }
    return accObj;
  }, levenshteinResults);

  // Perform alpha search and save results IF LD of 0 isn't found
  let alphaResults = [];
  if (levenshteinResults[0].length === 0) {
    alphaResults = alphaSearch(searchTerm, list);
  }

  /* ---------------
   * SEARCH METHODS
   * ---------------
   * 1. LD of 0 == 1 result
   * 2. LD == 1 result && alpha is 0 or same
   * 3. Single result alpha search with >= 4 char
   * 4. ELSE; if no results, then couldn't find; if multiple results, couldn't figure out
   * ------------ */

  // first populate a set of results
  if (levenshteinResults[0].length === 1) {
    return levenshteinResults[0];
  }
  const levenshteinResultsFlat = _.values(levenshteinResults)
    .reduce((acc, val) => acc.concat(val), []);
  const resultsSet = new Set();
  levenshteinResultsFlat
    .concat(alphaResults)
    .forEach(co => resultsSet.add(co));
  const results = [];
  resultsSet.forEach(v => results.push(v));
  return results;
};

const lookupPromiseNoReject = (searchTerm, list) => {
  let results = lookup(searchTerm, list);
  results = results.length > 0 ? results : null;
  return new Promise(resolve => resolve(results));
};

/* Exports ==================================================================== */

module.exports = {
  unicornJSON,
  unicorns,
  levenshteinA,
  levenshteinB,
  alphaSearch,
  lookup,
  lookupPromiseNoReject,
  getUnicornInfo,
};

// console.log(levenshteinA('hello world kitten', 'hello wolrd sitting'));
// console.log(levenshteinB('hello world kitten', 'hello wolrd sitting'));
