const express = require('express');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const { userCount } = require('../modules/userCount-middleware');
const encryptLib = require('../modules/encryption');
const pool = require('../modules/pool');
const userStrategy = require('../strategies/user.strategy');
const robot = require('../modules/robot');
const databaseClient = require('../modules/databaseClient');
const cache = require('../modules/cache');

const router = express.Router();

// function to check if there are any users
async function anyAdmins() {
  return new Promise(async (resolve, reject) => {
    const queryText = `SELECT count(*) FROM "user" WHERE "admin"=true;`;
    try {
      let result = await pool.query(queryText);
      resolve(result.rows[0].count)
    } catch (err) {
      console.log('problem getting number of admins', err);
    }
  })
}

// Handles Ajax request for user information if user is authenticated
router.get('/all', rejectUnauthenticated, async (req, res) => {
  const isAdmin = req.user.admin;
  if (isAdmin) {
    try {
      const userList = await databaseClient.getAllUsers();
      res.send(userList);
    } catch (err) {
      console.log('error sending list of users to admin', err);
      res.sendStatus(500)
    }

  } else {
    res.sendStatus(403)
  }
});

// Handles Ajax request for user information if user is authenticated
router.get('/', rejectUnauthenticated, async (req, res) => {
  // console.log('get user route');
  try {
    const botSettings = await databaseClient.getBotSettings();
    req.user.botMaintenance = botSettings.maintenance;
  } catch (err) {
    console.log(err, 'error in user route');
  }
  // Send back user object from the session (previously queried from the database)
  res.send(req.user);
});

// Handles POST request with new user data
// The only thing different from this and every other post we've seen
// is that the password gets encrypted before being inserted
router.post('/register', userCount, async (req, res, next) => {
  const username = req.body.username;
  const password = encryptLib.encryptPassword(req.body.password);
  try {
    let adminCount = await anyAdmins();
    const joined_at = new Date();
    console.log('THERE ARE THIS MANY ADMINS!!!!!', adminCount);

    if (adminCount > 0) {
      // create the user
      let queryText = `INSERT INTO "user" (username, password, joined_at)
      VALUES ($1, $2, $3) RETURNING id;`;
      let result = await pool.query(queryText, [username, password, joined_at]);
      const user = result.rows[0];
      const userID = result.rows[0].id;

      // create entry in api table
      let secondQueryText = `INSERT INTO "user_api" ("userID")
      VALUES ($1);`;
      let secondResult = await pool.query(secondQueryText, [userID]);

      // create entry in user_settings table
      let thirdQueryText = `INSERT INTO "user_settings" ("userID")
      VALUES ($1);`;
      let thirdResult = await pool.query(thirdQueryText, [userID]);

      // set up cache storage for new user
      cache.newUser(user);
      // start a sync loop for the new user
      robot.syncOrders(userID, 0);
      // robot.deSyncOrderLoop(user, 0);
    } else {
      // create the user
      let queryText = `INSERT INTO "user" (username, password, admin, approved, joined_at)
      VALUES ($1, $2, true, true, $3) RETURNING id`;
      let result = await pool.query(queryText, [username, password, joined_at]);
      const user = result.rows[0];
      const userID = result.rows[0].id;

      // create entry in api table
      let secondQueryText = `INSERT INTO "user_api" ("userID")
      VALUES ($1);`;
      let secondResult = await pool.query(secondQueryText, [userID]);

      // create entry in user_settings table
      let thirdQueryText = `INSERT INTO "user_settings" ("userID")
      VALUES ($1);`;
      let thirdResult = await pool.query(thirdQueryText, [userID]);

      // set up cache storage for new user
      cache.newUser(userID);
      // start a sync loop for the new user
      robot.syncOrders(userID, 0);
      // robot.deSyncOrderLoop(user, 0);
    }

    res.sendStatus(201);
  } catch (err) {
    console.log('User registration failed: ', err);
    res.sendStatus(500);
  };
});

// Handles login form authenticate/login POST
// userStrategy.authenticate('local') is middleware that we run on this route
// this middleware will run our POST if successful
// this middleware will send a 401 if not successful
router.post('/login', userStrategy.authenticate('local'), (req, res) => {
  console.log('in login route');
  res.sendStatus(200);
});

// clear all server session information about this user
router.post('/logout', (req, res) => {
  // Use passport's built-in method to log out the user
  req.logout();
  res.sendStatus(200);
});

/**
* PUT route - Approve a single user. Only admin can do this
*/
router.put('/approve', rejectUnauthenticated, async (req, res) => {
  try {
    const isAdmin = req.user.admin;
    if (isAdmin) {
      console.log('you are admin');
      const userToApprove = req.body.data.id;
      console.log('in approve user route', userToApprove);
      const queryText = `UPDATE "user" SET "approved" = true WHERE "id" = $1;`;
      await pool.query(queryText, [userToApprove]);
      res.sendStatus(200);
    } else {
      console.log('you are NOT admin');
      res.sendStatus(403);
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

/**
* DELETE route - Delete a single user. Only admin can do this
*/
router.delete('/', rejectUnauthenticated, async (req, res) => {
  try {
    console.log('in delete user route');
    const isAdmin = req.user.admin;
    if (isAdmin) {
      console.log('you are admin');
      const userToDelete = req.body.id;
      // delete from user table first
      const userQueryText = `DELETE from "user" WHERE "id" = $1;`;
      await pool.query(userQueryText, [userToDelete]);

      // delete from API table 
      const apiQueryText = `DELETE from "user_api" WHERE "userID" = $1;`;
      await pool.query(apiQueryText, [userToDelete]);

      // delete from orders table 
      const ordersQueryText = `DELETE from "orders" WHERE "userID" = $1;`;
      await pool.query(ordersQueryText, [userToDelete]);

      // delete from user settings table 
      const userSettingsQueryText = `DELETE from "user_settings" WHERE "userID" = $1;`;
      await pool.query(userSettingsQueryText, [userToDelete]);

      res.sendStatus(200);
    } else {
      const userID = req.body.id;
      const userToDelete = req.body.id;
      console.log('you are NOT admin');
      // check to make sure the user ID that was sent is the same as the user requesting the delete
      if (userID === userToDelete) {

        // delete from user table
        const userQueryText = `DELETE from "user" WHERE "id" = $1;`;
        await pool.query(userQueryText, [userToDelete]);

        // delete from API table 
        const apiQueryText = `DELETE from "user_api" WHERE "userID" = $1;`;
        await pool.query(apiQueryText, [userToDelete]);

        // delete from orders table 
        const ordersQueryText = `DELETE from "orders" WHERE "userID" = $1;`;
        await pool.query(ordersQueryText, [userToDelete]);

        // delete from user settings table 
        const userSettingsQueryText = `DELETE from "user_settings" WHERE "userID" = $1;`;
        await pool.query(userSettingsQueryText, [userToDelete]);

      }
      res.sendStatus(200);
    }
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

module.exports = router;
