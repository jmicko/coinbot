// const passport = require('passport');
import passport from 'passport';
// const LocalStrategy = require('passport-local').Strategy;
import { Strategy as LocalStrategy } from 'passport-local';
// const encryptLib = require('../modules/encryption');
import encryptLib from '../modules/encryption.js';
// const pool = require('../modules/pool');
import { pool } from '../modules/pool.js';
import { devLog } from '../modules/utilities.js';

// explanation of serialization: https://stackoverflow.com/questions/27637609/understanding-passport-serialize-deserialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// If we want to store API keys in the DB instead of .ENV file, maybe need to 
// adjust pool query to decrypt them before deleting the password from the user object?
// but password has already been salted/hashed before storing. Can we safely access it before salt/hash?
passport.deserializeUser((id, done) => {
  pool.query(`SELECT * 
  FROM "user" 
  JOIN "user_settings" ON ("user"."id" = "user_settings"."userID")
  WHERE id = $1;`, [id])
    .then((result) => {
      // Handle Errors
      const user = result && result.rows && result.rows[0];

      if (user) {
        // user found
        // remove password so it doesn't get sent
        delete user.password;
        // done takes an error (null in this case) and a user
        done(null, user);
      } else {
        // user not found
        // done takes an error (null in this case) and a user (also null in this case)
        // this will result in the server returning a 401 status code
        done(null, null);
      }
    })
    .catch((error) => {
      devLog('Error with query during deserializing user ', error);
      // done takes an error (we have one) and a user (null in this case)
      // this will result in the server returning a 500 status code
      done(error, null);
    });
});

// Does actual work of logging in
passport.use(
  'local',
  new LocalStrategy(
    (username, password, done) => {
      pool.query(
        `SELECT *
        FROM "user"
        JOIN "user_settings" ON ("user"."id" = "user_settings"."userID")
        WHERE username = $1`, 
        [username]
        )
        .then((result) => {
          const user = result && result.rows && result.rows[0];
          if (user && encryptLib.comparePassword(password, user.password)) {
            // All good! Passwords match!
            // done takes an error (null in this case) and a user
            done(null, user);
          } else {
            // Not good! Username and password do not match.
            // done takes an error (null in this case) and a user (also null in this case)
            // this will result in the server returning a 401 status code
            done(null, null);
          }
        })
        .catch((error) => {
          devLog('Error with query for user ', error);
          // done takes an error (we have one) and a user (null in this case)
          // this will result in the server returning a 500 status code
          done(error, null);
        });
    })
);

export default passport;
