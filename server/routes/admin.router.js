const express = require('express');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const { userCount } = require('../modules/userCount-middleware');
const encryptLib = require('../modules/encryption');
const pool = require('../modules/pool');
const userStrategy = require('../strategies/user.strategy');
const robot = require('../modules/robot');
const databaseClient = require('../modules/databaseClient');
const { cache, userStorage, messenger } = require('../modules/cache');

const router = express.Router();

// Handles request for all user information if user is authenticated and admin
router.get('/users', rejectUnauthenticated, async (req, res) => {
  console.log('get all users route');
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

/**
* PUT route - Approve a single user. Only admin can do this
*/
router.put('/users', rejectUnauthenticated, async (req, res) => {
  try {
    const isAdmin = req.user.admin;
    if (isAdmin) {
      console.log('you are admin');
      const userToApprove = req.body.id;
      console.log('in approve user route', userToApprove);
      const queryText = `UPDATE "user" SET "approved" = true WHERE "id" = $1 RETURNING *;`;
      const user = await pool.query(queryText, [userToApprove]);
      userStorage[userToApprove].approve(true);
      res.sendStatus(200);
    } else {
      console.log('you are NOT admin');
      res.sendStatus(403);
    }
  } catch (err) {
    console.log(err, 'error in approve put route');
    res.sendStatus(500);
  }
});

/**
* DELETE route - Delete a single user. Only admin can do this
*/
router.delete('/users/:user_id', rejectUnauthenticated, async (req, res) => {
  const userToDelete = req.params.user_id;
  const userID = req.user.id;
  try {
    console.log('in delete user route');
    const isAdmin = req.user.admin;
    if (isAdmin) {
      console.log('you are admin');
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
      console.log('you are NOT admin');
      // check to make sure the user ID that was sent is the same as the user requesting the delete

      res.sendStatus(403); // forbidden
    }
  } catch (err) {
    console.log(err, 'error in delete user route');
    res.sendStatus(500);
  } finally {
    userStorage.deleteUser(userToDelete);


  }
});

module.exports = router;
