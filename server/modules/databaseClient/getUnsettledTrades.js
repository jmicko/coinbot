const pool = require('../pool');

const getUnsettledTrades = (side) => {
  return new Promise((resolve, reject) => {
    let sqlText;
    // put sql stuff here, extending the pool promise to the parent function
    if (side == 'buy') {
      sqlText = `SELECT * FROM "orders" WHERE "side"='buy' AND "settled"=false 
      ORDER BY "price" DESC;`;
    } else if (side == 'sell') {
      sqlText = `SELECT * FROM "orders" WHERE "side"='sell' AND "settled"=false 
      ORDER BY "price" DESC;`;
    } else if (side == 'all') {
      sqlText = `SELECT * FROM "orders" WHERE "settled"=false;`;
    } else if (side == 'highBuy') {
      sqlText = `SELECT * FROM "orders" WHERE "side"='buy' AND "settled"=false 
      ORDER BY "price" DESC
	    LIMIT(1);`;
    } else if (side == 'lowSell') {
      sqlText = `SELECT * FROM "orders" WHERE "side"='sell' AND "settled"=false 
      ORDER BY "price" ASC
	    LIMIT(1);`;
    }
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