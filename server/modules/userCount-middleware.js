const pool = require('../modules/pool');

const userCount = (req, res, next) => {
  // check if there is already a user in the db
  const queryText = `SELECT count(*) FROM "user";`;
  pool.query(queryText)
    .then((result) => {
      if (result && result.rows && (result.rows[0].count < 1)) {
        console.log('number of users:', result.rows[0].count);
        next();
      } else {
        // forbid additional user creation if there already is a user
        res.sendStatus(403);
      }
    })
};

module.exports = { userCount };