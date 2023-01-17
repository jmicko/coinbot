import CryptoJS from 'crypto-js';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
const pgS = pgSession(session);
import { pool } from './pool.js';
import { devLog } from '../../src/shared.js';

if (process.env.SERVER_SESSION_SECRET === 'pleaseForTheLoveOfMoneyPutADifferentSecretHere') {
  console.log('Please change the session secret environment variable in .env');
  ((process.env.NODE_ENV !== 'development') || (process.env.NODE_ENV === undefined))
    ? process.exit(1)
    : console.log('Development mode, continuing anyway');
}

/* In production, this will generate a cryptographically sound random string every time the
server restarts. This will log out any current sessions, but is slightly more secure than 
storing in a .env file, which can more easily be stolen or accidentally pushed to a repo */

// const crypto = require('crypto');
const secret = process.env.NODE_ENV === 'production'
  ? CryptoJS.lib.WordArray.random(256).toString()
  : process.env.SERVER_SESSION_SECRET;
process.env.SERVER_SESSION_SECRET = secret;

const sessionMiddleware = session({
  store: new pgS({
    pool: pool, // Connection pool
  }),
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