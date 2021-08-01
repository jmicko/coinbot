const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./pool');

module.exports = session({
  store: new pgSession({
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
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day (24 hr * 60 min * 60 sec * 1000 msec)
});