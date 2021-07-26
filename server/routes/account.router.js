const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const authedClient = require('../modules/authedClient');
const databaseClient = require('../modules/databaseClient/databaseClient');


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

  authedClient.get(['fees'])
  .then((result) => {
    console.log(result);
    res.send(result)
  })
  .catch((error) => {
    res.sendStatus(500)
  })


});



module.exports = router;
