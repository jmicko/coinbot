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
* GET route to get the fees when the user loads the page
*/
router.get('/fees', (req, res) => {
  authedClient.get(['fees'])
  .then((result) => {
    res.send(result)
  })
  .catch((error) => {
    res.sendStatus(500)
  })


});



module.exports = router;
