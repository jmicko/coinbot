const pool = require('../pool');

const getUnsettledTrades = () => {
  return new Promise((resolve, reject) => {
    // put sql stuff here, extending the pool promise to the parent function
    const sqlText = `SELECT * FROM "orders" WHERE "settled"=FALSE;`;
    pool.query(sqlText)
      .then((results) => {
        // promise returns promise from pool if success
        resolve(results.rows);
      })
      .catch((err) => {
        // or promise relays errors from pool to parent
        reject(err);
      })
  });
}

module.exports = getUnsettledTrades