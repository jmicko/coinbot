const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const authedClient = require('../modules/authedClient');
const databaseClient = require('../modules/databaseClient/databaseClient');
const customCoinbaseClient = require('../modules/customCoinbaseClient');


/**
 * POST route 
 */
router.post('/', (req, res) => {

});

/**
* GET route - will be used for getting some account settings etc
*/
router.get('/fees', (req, res) => {
  // GET route code here
  console.log('in the server account GET route')

      res.sendStatus(200)

});



module.exports = router;
