const pool = require('../modules/pool');

const userCount = (req, res, next) => {
  // check if there is already a user in the db
  const queryText = `SELECT count(*) FROM "user" WHERE "active"=false;`;
  pool.query(queryText)
    .then((result) => {
      if (result && result.rows && (result.rows[0].count < 3)) {
        console.log('number of users:', result.rows[0].count);
        next();
      } else {
        console.log('too many users!');
        // forbid additional user creation if there are too many users
        res.sendStatus(403);
      }
    })
};

module.exports = { userCount };