// const passport = require('passport');
import passport from 'passport';
// const LocalStrategy = require('passport-local').Strategy;
import { Strategy as LocalStrategy } from 'passport-local';
// const encryptLib = require('../modules/encryption');
import encryptLib from '../modules/encryption.js';
// const pool = require('../modules/pool');
import { pool } from '../modules/pool.js';
import { devLog } from '../modules/utilities.js';
import { databaseClient } from '../modules/databaseClient.js';

// explanation of serialization: https://stackoverflow.com/questions/27637609/understanding-passport-serialize-deserialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await databaseClient.getUserAndSettings(id, 'user.strategy.deserializeUser');

    if (user) {
      // user found - remove password so it doesn't get sent
      delete user.password;
      done(null, user);
    } else {
      // user not found
      done(null, null);
    }
  } catch (error) {
    devLog('Error with query during deserializing user ', error);
    done(error, null);
  }
});

// Does actual work of logging in
passport.use('local', new LocalStrategy(async (username, password, done) => {
  try {
    const user = await databaseClient.getUserAndSettingsByUsername(username);
    
    if (user && encryptLib.comparePassword(password, user.password)) {
      // All good! Passwords match!
      done(null, user);
    } else {
      // Not good! Username and password do not match.
      done(null, null);
    }
  } catch (error) {
    devLog('Error with query for user ', error);
    done(error, null);
  }
}));

export default passport;
