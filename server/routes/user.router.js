import express from 'express';
import { rejectUnauthenticated, } from '../modules/authentication-middleware.js';
import { userCount } from '../modules/userCount-middleware.js';
import encryptLib from '../modules/encryption.js';
import { pool } from '../modules/pool.js';
import userStrategy from '../strategies/user.strategy.js';
import { robot } from '../modules/robot.js';
import { databaseClient } from '../modules/databaseClient.js';
import { userStorage, messenger } from '../modules/cache.js';
import { devLog } from '../modules/utilities.js';

const router = express.Router();

// function to check if there are any users
async function anyAdmins() {
  return new Promise(async (resolve, reject) => {
    const queryText = `SELECT count(*) FROM "user" WHERE "admin"=true;`;
    try {
      let result = await pool.query(queryText);
      resolve(result.rows[0].count)
    } catch (err) {
      devLog('problem getting number of admins', err);
    }
  })
}

// Handles request for all user information if user is authenticated and admin
router.get('/all', rejectUnauthenticated, async (req, res) => {
  devLog('get all users route');
  const isAdmin = req.user.admin;
  if (isAdmin) {
    try {
      const userList = await databaseClient.getAllUsers();
      res.send(userList);
    } catch (err) {
      devLog('error sending list of users to admin', err);
      res.sendStatus(500)
    }

  } else {
    res.sendStatus(403)
  }
});

// Handles request for user information if user is authenticated
router.get('/', rejectUnauthenticated, async (req, res) => {
  devLog('get user route');
  try {
    const botSettings = await databaseClient.getBotSettings();
    req.user.botMaintenance = botSettings.maintenance;
    req.user.botSettings = botSettings;

    // const URI = cache.getAPI(req.user.id).API_URI;
    req.user.sandbox = false
    //  (URI === 'https://api-public.sandbox.exchange.coinbase.com')
    // ? true
    // : false

    // get available funds from userStorage
    const availableFunds = userStorage[req.user.id].getAvailableFunds();
    devLog('availableFunds', availableFunds);
    req.user.availableFunds = availableFunds;

    // get exporting value from userStorage
    const exporting = userStorage[req.user.id].exporting;
    req.user.exporting = exporting;

    // get simulating value from userStorage
    const simulating = userStorage[req.user.id].simulating;
    req.user.simulating = simulating;

    // devLog('simulating', req.user);

  } catch (err) {
    devLog(err, 'error in user route');
  }
  // devLog('user', req.user)
  // Send back user object from the session (previously queried from the database)
  res.send(req.user);
});

// Handles POST request with new user data
// The only thing different from this and every other post we've seen
// is that the password gets encrypted before being inserted
router.post('/register', userCount, async (req, res, next) => {
  try {
    const username = req.body.username;
    const pass = req.body.password;
    devLog('registering user', username, pass);
    if (
      !username ||
      !pass ||
      username !== username.toLowerCase() ||
      pass !== pass.toLowerCase() ||
      username.includes(' ') ||
      pass.includes(' ') ||
      username.includes('\'') ||
      pass.includes('\'') ||
      username.includes('\"') ||
      pass.includes('\"') ||
      username.includes('`') ||
      pass.includes('`') ||
      username.includes('!')

    ) {
      res.sendStatus(403);
      return;
    }

    const password = encryptLib.encryptPassword(pass);
    let adminCount = await anyAdmins();
    let user;
    const joined_at = new Date();
    devLog('THERE ARE THIS MANY ADMINS!!!!!', adminCount);

    if (adminCount > 0) {
      // create the user
      let queryText = `INSERT INTO "user" (username, password, joined_at)
      VALUES ($1, $2, $3) RETURNING id;`;
      let result = await pool.query(queryText, [username, password, joined_at]);
      user = result.rows[0];
      const userID = result.rows[0].id;

      // create entry in api table
      let secondQueryText = `INSERT INTO "user_api" ("userID")
      VALUES ($1);`;
      let secondResult = await pool.query(secondQueryText, [userID]);

      // create entry in user_settings table
      let thirdQueryText = `INSERT INTO "user_settings" ("userID", "profit_reset")
      VALUES ($1, $2);`;
      let thirdResult = await pool.query(thirdQueryText, [userID, joined_at]);

    } else {
      // create the user
      let queryText = `INSERT INTO "user" (username, password, admin, approved, joined_at) VALUES ($1, $2, true, true, $3) RETURNING id`;
      let result = await pool.query(queryText, [username, password, joined_at]);
      user = result.rows[0];
      const userID = result.rows[0].id;

      // create entry in api table
      let secondQueryText = `INSERT INTO "user_api" ("userID") VALUES ($1);`;
      let secondResult = await pool.query(secondQueryText, [userID]);

      // create entry in user_settings table
      let thirdQueryText = `INSERT INTO "user_settings" ("userID", "profit_reset") VALUES ($1, $2);`;
      let thirdResult = await pool.query(thirdQueryText, [userID, joined_at]);
    }

    // START THE LOOPS
    robot.initializeUserLoops(user);

    res.sendStatus(201);
  } catch (err) {
    devLog('User registration failed: ', err);
    res.sendStatus(500);
  };
});

// Handles login form authenticate/login POST
// userStrategy.authenticate('local') is middleware that we run on this route
// this middleware will run our POST if successful
// this middleware will send a 401 if not successful
router.post('/login', userStrategy.authenticate('local'), async (req, res) => {
  devLog(req.user, 'in login route');
  // res.sendStatus(200);
  try {
    const botSettings = await databaseClient.getBotSettings();
    req.user.botMaintenance = botSettings.maintenance;
    req.user.botSettings = botSettings;

    // const URI = cache.getAPI(req.user.id).API_URI;
    req.user.sandbox = false
    //  (URI === 'https://api-public.sandbox.exchange.coinbase.com')
    // ? true
    // : false

    // get available funds from userStorage
    const availableFunds = userStorage[req.user.id].getAvailableFunds();
    devLog('availableFunds', availableFunds);
    req.user.availableFunds = availableFunds;

    // get exporting value from userStorage
    const exporting = userStorage[req.user.id].exporting;
    req.user.exporting = exporting;

    // get simulating value from userStorage
    const simulating = userStorage[req.user.id].simulating;
    req.user.simulating = simulating;

    // devLog('simulating', req.user);

  } catch (err) {
    devLog(err, 'error in user route');
  }
  // devLog('user', req.user)
  // Send back user object from the session (previously queried from the database)
  res.status(200).send(req.user);
});

// clear all server session information about this user
router.post('/logout', rejectUnauthenticated, (req, res) => {
  try {
    const userID = req.user.id;
    devLog('LOGGING OUT USER');
    // Use passport's built-in method to log out the user
    req.logout();
    res.sendStatus(200);
    messenger[userID].userUpdate();
  } catch (err) {
    devLog(err, 'error in logout route');
  }
});

/**
* PUT route - Approve a single user. Only admin can do this
*/
router.put('/approve', rejectUnauthenticated, async (req, res) => {
  try {
    const isAdmin = req.user.admin;
    if (isAdmin) {
      devLog('you are admin');
      const userToApprove = req.body.data.id;
      devLog('in approve user route', userToApprove);
      const queryText = `UPDATE "user" SET "approved" = true WHERE "id" = $1 RETURNING *;`;
      const user = await pool.query(queryText, [userToApprove]);
      userStorage[userToApprove].approve(true);
      res.sendStatus(200);
    } else {
      devLog('you are NOT admin');
      res.sendStatus(403);
    }
  } catch (err) {
    devLog(err, 'error in approve put route');
    res.sendStatus(500);
  }
});

/**
* DELETE route - Delete a single user. Only admin can do this
*/
router.delete('/:user_id', rejectUnauthenticated, async (req, res) => {
  const userToDelete = Number(req.params.user_id);
  const userID = req.user.id;
  try {
    devLog('in delete user route');
    const isAdmin = req.user.admin;
    if (isAdmin) {
      devLog('you are admin');
      // delete from user table first
      const userQueryText = `DELETE from "user" WHERE "id" = $1;`;
      await pool.query(userQueryText, [userToDelete]);

      // delete from API table 
      const apiQueryText = `DELETE from "user_api" WHERE "userID" = $1;`;
      await pool.query(apiQueryText, [userToDelete]);

      // delete from orders table 
      const ordersQueryText = `DELETE from "limit_orders" WHERE "userID" = $1;`;
      await pool.query(ordersQueryText, [userToDelete]);

      // delete from user settings table 
      const userSettingsQueryText = `DELETE from "user_settings" WHERE "userID" = $1;`;
      await pool.query(userSettingsQueryText, [userToDelete]);

      res.sendStatus(200);
    } else {
      // const userToDelete = req.body.id;
      devLog('you are NOT admin');
      // check to make sure the user ID that was sent is the same as the user requesting the delete
      // if (userID === userToDelete) {
      if (userID === userToDelete) {
        devLog('you are deleting yourself');

        // delete from user table
        const userQueryText = `DELETE from "user" WHERE "id" = $1;`;
        await pool.query(userQueryText, [userToDelete]);

        // delete from API table 
        const apiQueryText = `DELETE from "user_api" WHERE "userID" = $1;`;
        await pool.query(apiQueryText, [userToDelete]);

        // delete from orders table 
        const ordersQueryText = `DELETE from "limit_orders" WHERE "userID" = $1;`;
        await pool.query(ordersQueryText, [userToDelete]);

        // delete from user settings table 
        const userSettingsQueryText = `DELETE from "user_settings" WHERE "userID" = $1;`;
        await pool.query(userSettingsQueryText, [userToDelete]);

      }
      res.sendStatus(200);
    }
  } catch (err) {
    devLog(err, 'error in delete user route');
    res.sendStatus(500);
  } finally {
    userStorage.deleteUser(userToDelete);
  }
});

export default router;
