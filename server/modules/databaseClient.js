const pool = require('./pool');
const socketClient = require('./socketClient');

// store an array of orders that need to be updated after filling
let updateSpool = [];

const storeTrade = (newOrder, originalDetails) => {
  return new Promise((resolve, reject) => {
    // add new order to the database
    const sqlText = `INSERT INTO "orders" 
      ("id", "userID", "price", "size", "trade_pair_ratio", "side", "settled", "product_id", "time_in_force", 
      "created_at", "done_at", "fill_fees", "filled_size", "executed_value", "original_buy_price", "original_sell_price") 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16);`;
    pool.query(sqlText, [
      newOrder.id,
      originalDetails.userID,
      newOrder.price,
      newOrder.size,
      originalDetails.trade_pair_ratio,
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


const getUnsettledTrades = (side, userID) => {
  return new Promise((resolve, reject) => {
    let sqlText;
    // put sql stuff here, extending the pool promise to the parent function

    if (side == 'buy') {
      // gets all unsettled buys, sorted by price
      sqlText = `SELECT * FROM "orders" WHERE "side"='buy' AND "settled"=false AND "will_cancel"=false AND "userID"=$1
      ORDER BY "price" DESC;`;
      pool.query(sqlText, [userID])
        .then((results) => {
          // promise returns promise from pool if success
          resolve(results.rows);
        })
        .catch((err) => {
          // or promise relays errors from pool to parent
          reject(err);
        })
    } else if (side == 'sell') {
      // gets all unsettled sells, sorted by price
      sqlText = `SELECT * FROM "orders" WHERE "side"='sell' AND "settled"=false AND "will_cancel"=false AND "userID"=$1
      ORDER BY "price" DESC;`;
      pool.query(sqlText, [userID])
        .then((results) => {
          // promise returns promise from pool if success
          resolve(results.rows);
        })
        .catch((err) => {
          // or promise relays errors from pool to parent
          reject(err);
        })
    } else if (side == 'all') {
      // gets all unsettled trades
      sqlText = `SELECT * FROM "orders" WHERE "settled"=false AND "userID"=$1;`;
      pool.query(sqlText, [userID])
        .then((results) => {
          // promise returns promise from pool if success
          resolve(results.rows);
        })
        .catch((err) => {
          // or promise relays errors from pool to parent
          reject(err);
        })
    }
  });
}


const getSingleTrade = (id) => {
  return new Promise((resolve, reject) => {
    let sqlText;
    // put sql stuff here, extending the pool promise to the parent function
    sqlText = `SELECT * FROM "orders" WHERE "id"=$1;`;
    pool.query(sqlText, [id])
      .then((results) => {
        const [singleTrade] = results.rows;
        // promise returns promise from pool if success
        resolve(singleTrade);
      })
      .catch((err) => {
        // or promise relays errors from pool to parent
        reject(err);
      })
  });
}

const checkIfCancelling = async (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('2222222222 id is ', id);
      let sqlText;
      // put sql stuff here, extending the pool promise to the parent function
      sqlText = `SELECT * FROM "orders" WHERE "id"=$1;`;
      let result = await pool.query(sqlText, [id]);
      const singleTrade = result.rows[0];
      // promise returns promise from pool if success
      resolve(singleTrade.will_cancel);
    } catch (err) {
      // or promise relays errors from pool to parent
      reject(err);
    }
  });
}

const deleteTrade = async (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const queryText = `DELETE from "orders" WHERE "id"=$1;`;
      let result = await pool.query(queryText, [id]);
      console.log('exchange was tossed lmao');
      socketClient.emit('message', {
        message: `exchange was removed from the database`,
        orderUpdate: true
      });
      resolve(result);
    } catch (err) {
      console.log('problem in deleteTrade function in databaseClient', err);
      reject(err)
    }
  });
}

async function getUser(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      sqlText = `SELECT * FROM "user" WHERE "id"=$1;`;
      let result = await pool.query(sqlText, [userID]);
      const user = result.rows[0];
      // console.log('THE RESULT IS', result.rows[0]);
      // console.log('THE user IS', user);
      resolve(user);
    } catch (err) {
      reject(err);
    }
  })
}


const databaseClient = {
  storeTrade: storeTrade,
  getUnsettledTrades: getUnsettledTrades,
  getSingleTrade: getSingleTrade,
  deleteTrade: deleteTrade,
  getUser: getUser,
  checkIfCancelling: checkIfCancelling
}

module.exports = databaseClient;