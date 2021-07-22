const pool = require('../pool');

const storeTrade = (pendingTrade) => {
  return new Promise((resolve, reject) => {
    // add new order to the database
    const newOrder = pendingTrade;
    const sqlText = `INSERT INTO "orders" 
    ("id", "price", "size", "side", "settled") 
    VALUES ($1, $2, $3, $4, $5);`;
    pool.query(sqlText, [newOrder.id, newOrder.price, newOrder.size, newOrder.side, newOrder.settled])
    .then((results) => {
      const success = {
        message : `order ${newOrder.id} was successfully stored in db`,
        results : results,
        success : true
      }
      // console.log(`order ${newOrder.id} was successfully stored in db`);
      resolve(success);
    })
    .catch((err) => {
      console.log('problem storing order in db', err);
      reject(err);
    });
  });
}

module.exports = storeTrade;