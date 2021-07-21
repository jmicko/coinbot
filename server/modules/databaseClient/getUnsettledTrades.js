const pool = require('../pool');

const getUnsettledTrades = () => {
  return new Promise((resolve, reject) => {
    const sqlText = `SELECT * FROM "orders" WHERE "settled"=FALSE;`;
    pool.query(sqlText)
      .then((results) => {
        resolve(results);
      })
      .catch((err) => {
        reject(err);
      })
  });
}

module.exports = getUnsettledTrades