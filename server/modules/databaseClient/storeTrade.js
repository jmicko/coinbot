const pool = require('../pool');
const socketClient = require('../socketClient');

const storeTrade = (newOrder, originalDetails) => {
  return new Promise((resolve, reject) => {
    // add new order to the database
    const sqlText = `INSERT INTO "orders" 
    ("id", "price", "size", "side", "settled", "product_id", "time_in_force", 
    "created_at", "done_at", "fill_fees", "filled_size", "executed_value", "original_buy_price", "original_sell_price") 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);`;
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
      newOrder.executed_value,
      originalDetails.original_buy_price,
      originalDetails.original_sell_price
    ])
      .then((results) => {
        const success = {
          message: `order ${newOrder.id} was successfully stored in db`,
          results: results,
          success: true
        }
        socketClient.emit('message', {
          message: `exchange was tossed into the ol' databanks`,
          orderUpdate: true
        });
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