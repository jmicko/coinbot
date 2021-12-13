const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const databaseClient = require('../modules/databaseClient');
const socketClient = require('../modules/socketClient');
const robot = require('../modules/robot');
const coinbaseClient = require('../modules/coinbaseClient');


/**
 * PUT route updating bot speed
 */
router.put('/loopSpeed', rejectUnauthenticated, async (req, res) => {
  // POST route code here
  const user = req.user;
  const loopSpeed = req.body.loopSpeed;
  if (user.admin) {
    console.log('loop speed route hit! SPEED:', loopSpeed);
    try {

      const queryText = `UPDATE "bot_settings" SET "loop_speed" = $1;`;

      await pool.query(queryText, [loopSpeed]);

      res.sendStatus(200);
    } catch (err) {
      console.log('error with loop speed route', err);
      res.sendStatus(500);
    }
  } else {
    console.log('user is not admin!');
    res.sendStatus(403)
  }
});



module.exports = router;
