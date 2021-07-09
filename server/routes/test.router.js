const express = require('express');
const pool = require('../modules/pool');

const router = express.Router();

/**
 * GET route template
 */
router.get('/', (req, res) => {
  // GET route code here
  console.log('in the server test GET route');
  const queryText = `
  SELECT * FROM "test";`;
  pool.query(queryText)
  .then((result) => {
    console.log(result.rows);
    const RESPONSE = {
      message: `hello from the backend server!`,
      db: result.rows
    }
    res.send(RESPONSE);
  })
  .catch((error) => {
    console.log('work request GET failed: ', error);
    res.sendStatus(500);
  });
});

/**
 * POST route template
 */
router.post('/', (req, res) => {
  // POST route code here
  console.log('in the server test POST route');
});

module.exports = router;
