// const session = require('express-session');
// const pgSession = require('connect-pg-simple')(session);
// const pool = require('./pool');
import session from 'express-session';
import pgSession from 'connect-pg-simple';
const pgS = pgSession(session);
import { pool } from './pool.js';

if (process.env.SERVER_SESSION_SECRET === 'pleaseForTheLoveOfMoneyPutADifferentSecretHere') {
  console.log('Please change the session secret environment variable in .env');
  ((process.env.NODE_ENV !== 'development') || (process.env.NODE_ENV === undefined)) 
  ? process.exit(1) 
  : console.log('Development mode, continuing anyway');
}

// generate a cryptographically sound random number every time server restarts
// this would log out any current sessions, but not a huge problem because coinbot will not handle
// more than one user, and does not frequently need to be restarted. Possibly multi-user in the future,
// but never very many. More secure to get logged out sometimes anyway
// const crypto = require('crypto');
// const secret = crypto.randomBytes(64).toString('hex');
// process.env.SERVER_SESSION_SECRET = secret;

console.log('Session secret:', process.env.SERVER_SESSION_SECRET);

const sessionMiddleware = session({
  store: new pgS({
    pool: pool, // Connection pool
  }),
  /* session secret could be changed to generate a cryptographically sound random number
  every time server restarts. This would log out any current sessions, but not a huge 
  problem because coinbot will not handle more than one user, and does not frequently need
  to be restarted. Possibly multi-user in the future, but never very many. More secure to 
  get logged out sometimes anyway */
  secret: process.env.SERVER_SESSION_SECRET,
  resave: false,
  saveUninitialized: false, // does not save session/cookie until login with passport
  // cookie age length could possibly drop for security, like how banks only give you like 5 minutes
  // but then you couldn't sit and watch the bot making trades
  // but then neither can your kids
  // or guests
  // or PRISM
  // jk who even knows what PRISM can still do
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 1 week (7 days * 24 hr * 60 min * 60 sec * 1000 msec)
});

const wrap = (expressMiddleware) => (socket, next) => expressMiddleware(socket.request, {}, next);

export { sessionMiddleware, wrap };