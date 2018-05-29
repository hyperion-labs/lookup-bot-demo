/* Variables ==================================================================== */

// constants
const port = process.env.PORT || 3000;

// libraries
const express = require('express');
const bodyParser = require('body-parser');

/* Server ==================================================================== */

// create server
const app = express();

// middleware
app.use(bodyParser.urlencoded({ extended: false }));

// Root get request
app.get('/', (req, res) => {
  res.send('Hello world!');
});

// listening
app.listen(port, () => console.log(`Server running on port ${port}`));
