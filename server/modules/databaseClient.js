const pool = require('./pool');
const socketClient = require('./socketClient');

// store an array of orders that need to be updated after filling
let updateSpool = [];

const storeTrade = (newOrder, originalDetails) => {
  return new Promise((resolve, reject) => {
    // add new order to the database
    const sqlText = `INSERT INTO "orders" 
      ("id", "userID", "price", "size", "trade_pair_ratio", "side", "settled", "product_id", "time_in_force", 
      "created_at", "done_at", "fill_fees", "previous_fill_fees", "filled_size", "executed_value", "original_buy_price", "original_sell_price") 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17);`;
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
      // bring the fees from the previous order to the new one for more accurate profit calculation
      originalDetails.fill_fees,
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
        // socketClient.emit('message', {
        //   orderUpdate: true,
        //   userID: Number(originalDetails.userID)
        // });
        resolve(success);
      })
      .catch((err) => {
        reject(err);
      });
  });
}


const getUnsettledTrades = (side, userID) => {
  return new Promise(async (resolve, reject) => {
    let userSettings = await getUserAndSettings(userID);
    let sqlText;
    // put sql stuff here, extending the pool promise to the parent function

    // the only time 'buy' or 'sell' is passed is when the frontend is calling for all trades. 
    // can request a limited amount of data to save on network costs
    if (side == 'buy') {
      // console.log('getting buys', userSettings.max_trade_load);
      // gets all unsettled buys, sorted by price
      sqlText = `SELECT "id", price, size, trade_pair_ratio, side, product_id, created_at, original_buy_price, original_sell_price FROM "orders" 
      WHERE "side"='buy' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1
      ORDER BY "price" DESC
      LIMIT $2;`;
      pool.query(sqlText, [userID, userSettings.max_trade_load])
      .then((results) => {
        // promise returns promise from pool if success
        resolve(results.rows);
      })
      .catch((err) => {
        // or promise relays errors from pool to parent
        reject(err);
      })
    } else if (side == 'sell') {
      // console.log('getting sells', userSettings.max_trade_load);
      // gets all unsettled sells, sorted by price
      sqlText = `SELECT "id", price, size, trade_pair_ratio, side, product_id, created_at, original_buy_price, original_sell_price FROM "orders" 
      WHERE "side"='sell' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1
      ORDER BY "price" ASC
      LIMIT $2;`;
      pool.query(sqlText, [userID, userSettings.max_trade_load])
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

const getUnsettledTradeCounts = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {

      // get total open orders
      let sqlTextTotal = `SELECT COUNT(*) FROM "orders" WHERE "userID"=$1 AND settled=false;`;
      let totalResult = await pool.query(sqlTextTotal, [userID]);
      const totalOpenOrders = totalResult.rows[0];

      // get total open buys
      let sqlTextBuys = `SELECT COUNT(*) FROM "orders" WHERE "userID"=$1 AND settled=false AND side='buy';`;
      let buysResult = await pool.query(sqlTextBuys, [userID]);
      const totalOpenBuys = buysResult.rows[0];

      // get total open sells
      let sqlTextSells = `SELECT COUNT(*) FROM "orders" WHERE "userID"=$1 AND settled=false AND side='sell';`;
      let sellsResult = await pool.query(sqlTextSells, [userID]);
      const totalOpenSells = sellsResult.rows[0];

      const unsettledOrderCounts = {
        totalOpenOrders,
        totalOpenBuys,
        totalOpenSells
      }

      // promise returns promise from pool if success
      resolve(unsettledOrderCounts);
    } catch (err) {
      // or promise relays errors from pool to parent
      reject(err);
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
      let sqlText;
      // put sql stuff here, extending the pool promise to the parent function
      sqlText = `SELECT * FROM "orders" WHERE "id"=$1;`;
      let result = await pool.query(sqlText, [id]);
      const singleTrade = result.rows[0];
      // promise returns promise from pool if success
      resolve(singleTrade?.will_cancel);
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
      resolve(result);
    } catch (err) {
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
      resolve(user);
    } catch (err) {
      reject(err);
    }
  })
}

async function getUserAndSettings(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      sqlText = `SELECT * 
      FROM "user" JOIN "user_settings" ON ("user"."id" = "user_settings"."userID")
      WHERE id = $1;`;
      let result = await pool.query(sqlText, [userID]);
      const user = result.rows[0];
      resolve(user);
    } catch (err) {
      reject(err);
    }
  })
}

async function getUserAPI(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      sqlText = `SELECT * FROM "user_api" WHERE "userID"=$1;`;
      let result = await pool.query(sqlText, [userID]);
      const userAPI = result.rows[0];
      resolve(userAPI);
    } catch (err) {
      reject(err);
    }
  })
}


async function getBotSettings() {
  return new Promise(async (resolve, reject) => {
    try {
      sqlText = `SELECT * FROM "bot_settings";`;
      let result = await pool.query(sqlText);
      const settings = result.rows[0];
      resolve(settings);
    } catch (err) {
      reject(err);
    }
  })
}

async function toggleMaintenance() {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "bot_settings" SET "maintenance" = NOT "maintenance";`;
      await pool.query(sqlText);
      resolve();
    } catch (err) {
      reject(err);
    }
  })
}

async function setReorder() {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "orders" SET "reorder" = true WHERE "settled"=false;`;
      await pool.query(sqlText);
      resolve();
    } catch (err) {
      reject(err);
    }
  })
}

async function setPause(status, userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "user_settings" SET "paused" = $1 WHERE "userID" = $2`;
      let result = await pool.query(sqlText, [status, userID]);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}

async function setKillLock(status, userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "user_settings" SET "kill_locked" = $1 WHERE "userID" = $2`;
      let result = await pool.query(sqlText, [status, userID]);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}


const databaseClient = {
  storeTrade: storeTrade,
  getUnsettledTrades: getUnsettledTrades,
  getUnsettledTradeCounts: getUnsettledTradeCounts,
  getSingleTrade: getSingleTrade,
  deleteTrade: deleteTrade,
  getUser: getUser,
  getUserAndSettings: getUserAndSettings,
  checkIfCancelling: checkIfCancelling,
  getUserAPI: getUserAPI,
  getBotSettings: getBotSettings,
  toggleMaintenance: toggleMaintenance,
  setReorder: setReorder,
  setKillLock: setKillLock
}

module.exports = databaseClient;