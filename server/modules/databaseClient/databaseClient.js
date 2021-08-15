// const storeTrade = require('./storeTrade');
// const getUnsettledTrades = require('./getUnsettledTrades');
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
        socketClient.emit('update', {
          message: `trade was tossed into the ol' databanks`,
          orderUpdate: true
        });
        resolve(success);
      })
      .catch((err) => {
        console.log('problem storing order in db', err);
        reject(err);
      });
  });
}


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


const getSingleTrade = (id) => {
  return new Promise((resolve, reject) => {
    let sqlText;
    // put sql stuff here, extending the pool promise to the parent function

    sqlText = `SELECT * FROM "orders" WHERE "id"=$1;`;
    pool.query(sqlText, [id])
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

const databaseClient = {
  storeTrade: storeTrade,
  getUnsettledTrades: getUnsettledTrades,
  getSingleTrade: getSingleTrade
}

module.exports = databaseClient;