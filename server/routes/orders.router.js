const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const authedClient = require('../modules/authedClient');
const databaseClient = require('../modules/databaseClient/databaseClient');
const robot = require('../modules/robot/robot')


/**
* GET route - get all orders
*/
router.get('/', (req, res) => {
  // GET route code here
  console.log('in the server orders GET route')

  // .then((result) => {
  //   console.log(result);
  //   res.send(result)
  // })
  // .catch((error) => {
    res.send('wooohooooo')
  // })


});



/**
* DELETE route
*/
router.delete('/', (req, res) => {
  // DELETE route code here
  console.log('in the server trade DELETE route')
    .then(data => {
      console.log('order was deleted successfully');
      console.log(data);
    })
    .catch((error) => {
      console.log('something failed', error);
      res.sendStatus(500)
    });

});




module.exports = router;
