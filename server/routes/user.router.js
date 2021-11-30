const express = require('express');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const { userCount } = require('../modules/userCount-middleware');
const encryptLib = require('../modules/encryption');
const pool = require('../modules/pool');
const userStrategy = require('../strategies/user.strategy');

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
  console.log('get all users route was hit!!!!!!!!');
  const isAdmin = req.user.admin;
  console.log('are you admin?', isAdmin);
  if (isAdmin) {
    try{
      const queryText = `SELECT "username", "active", "approved" FROM "user";`;
      let result = await pool.query(queryText);
      let userList = result.rows
      console.log('sending list of users', userList);
      res.send(userList);
    } catch(err){
      console.log('error sending list of users to admin', err);
      res.sendStatus(500)
    }
    
  } else {
    res.sendStatus(403)
  }
});

// Handles Ajax request for user information if user is authenticated
router.get('/', rejectUnauthenticated, (req, res) => {
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
    console.log('THERE ARE THIS MANY ADMINS!!!!!', adminCount);

    if (adminCount > 0) {
      let queryText = `INSERT INTO "user" (username, password)
        VALUES ($1, $2) RETURNING id`;
      let result = await pool.query(queryText, [username, password]);
      console.log(result);
    } else {
      let queryText = `INSERT INTO "user" (username, password, admin, active, approved)
        VALUES ($1, $2, true, true, true) RETURNING id`;
      let result = await pool.query(queryText, [username, password]);
      console.log(result);
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

module.exports = router;
