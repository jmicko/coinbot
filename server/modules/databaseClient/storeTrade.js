const pool = require('../pool');

const storeTrade = (newOrder) => {
  return new Promise((resolve, reject) => {
    // add new order to the database
    const sqlText = `INSERT INTO "orders" 
    ("id", "price", "size", "side", "settled", "product_id", "time_in_force", 
    "created_at", "done_at", "fill_fees", "filled_size", "executed_value") 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12);`;
    pool.query(sqlText, [
      newOrder.id,
      newOrder.price,
      newOrder.size,
      newOrder.side,
      newOrder.settled,
      newOrder.product_id,
      newOrder.time_in_force,
      newOrder.created_at,
      newOrder.done_at,
      newOrder.fill_fees,
      newOrder.filled_size,
      newOrder.executed_value
      // newOrder.original_buy_price
      // newOrder.original_sell_price
    ])
      .then((results) => {
        const success = {
          message: `order ${newOrder.id} was successfully stored in db`,
          results: results,
          success: true
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