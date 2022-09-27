const pool = require('./pool');

// stores the details of a trade-pair. The originalDetails are details that stay with a trade-pair when it is flipped
// flipped_at is the "Time" shown on the interface. It has no other function
const storeTrade = (newOrder, originalDetails, flipped_at) => {
  return new Promise((resolve, reject) => {
    // add new order to the database
    const sqlText = `INSERT INTO "orders" 
      ("id", "userID", "price", "size", "trade_pair_ratio", "side", "settled", "product_id", "time_in_force", 
      "created_at", "flipped_at", "done_at", "fill_fees", "previous_fill_fees", "filled_size", "executed_value", "original_buy_price", "original_sell_price") 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18);`;
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
      flipped_at,
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
        resolve(success);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// same as above, only set reorder = true so that the bot knows not to check coinbase for it. 
// this is used in the autoSetup function to speed up the process
const storeReorderTrade = (newOrder, originalDetails, flipped_at) => {
  return new Promise((resolve, reject) => {
    // add new order to the database
    const sqlText = `INSERT INTO "orders" 
      ("id", "userID", "price", "size", "trade_pair_ratio", "side", "settled", "product_id", "time_in_force", 
      "created_at", "flipped_at", "done_at", "fill_fees", "previous_fill_fees", "filled_size", "executed_value", "original_buy_price", "original_sell_price", "reorder") 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`;
    pool.query(sqlText, [
      newOrder.id,
      originalDetails.userID,
      newOrder.price,
      newOrder.size,
      originalDetails.trade_pair_ratio,
      newOrder.side,
      false,
      newOrder.product_id,
      newOrder.time_in_force,
      newOrder.created_at,
      flipped_at,
      newOrder.done_at,
      newOrder.fill_fees,
      // bring the fees from the previous order to the new one for more accurate profit calculation
      originalDetails.fill_fees,
      newOrder.filled_size,
      newOrder.executed_value,
      originalDetails.original_buy_price,
      originalDetails.original_sell_price,
      true
    ])
      .then((results) => {
        const success = {
          message: `order ${newOrder.id} was successfully stored in db`,
          results: results,
          success: true
        }
        resolve(success);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// This function is used when importing trades from the user interface
// IT MUST USE THE USER ID FROM PASSPORT AUTHENTICATION!!!
// otherwise you could import false trades for someone else!
const importTrade = ( details, userID) => {
  return new Promise((resolve, reject) => {
    // add new order to the database
    const sqlText = `INSERT INTO "orders" 
      ("id", "userID", "price", "size", "trade_pair_ratio", "side", "settled", "product_id", "time_in_force", 
      "created_at", "flipped_at", "done_at", "fill_fees", "previous_fill_fees", "filled_size", "executed_value", "original_buy_price", "original_sell_price", "reorder") 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`;
    pool.query(sqlText, [
      details.id,
      userID,
      details.price,
      details.size,
      details.trade_pair_ratio,
      details.side,
      details.settled, // todo - maybe force this to false or you could falsify your profit
      details.product_id,
      details.time_in_force,
      details.created_at,
      details.flipped_at,
      details.done_at,
      details.fill_fees,
      details.fill_fees,
      details.filled_size,
      details.executed_value,
      details.original_buy_price,
      details.original_sell_price,
      true
    ])
      .then((results) => {
        const success = {
          message: `order ${details.id} was successfully stored in db`,
          results: results,
          success: true
        }
        resolve(success);
      })
      .catch((err) => {
        reject(err);
      });
  });
}

// gets all open orders in db based on a specified limit. 
// The limit is for each side, so the results will potentially double that
const getLimitedUnsettledTrades = (userID, limit) => {
  return new Promise(async (resolve, reject) => {
    // get limit of buys
    // get limit of sells
    try {

      let sqlText = `(SELECT * FROM "orders" WHERE "side"='sell' AND "flipped"=false AND "settled"=false AND "will_cancel"=false AND "userID"=$1 ORDER BY "price" ASC LIMIT $2)
      UNION
      (SELECT * FROM "orders" WHERE "side"='buy' AND "flipped"=false AND "settled"=false AND "will_cancel"=false AND "userID"=$1 ORDER BY "price" DESC LIMIT $2)
      ORDER BY "price" DESC;`;
      const results = await pool.query(sqlText, [userID, limit]);

      resolve(results.rows);
    } catch (err) {
      reject(err);
    }
  });
}

// gets all open orders in db based on a specified limit. 
// The limit is for each side, so the results will potentially double that
const getLimitedTrades = (userID, limit) => {
  return new Promise(async (resolve, reject) => {
    // get limit of buys
    // get limit of sells
    try {

      let sqlText = `(SELECT * FROM "orders" WHERE "side"='sell' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1 ORDER BY "price" ASC LIMIT $2)
      UNION
      (SELECT * FROM "orders" WHERE "side"='buy' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1 ORDER BY "price" DESC LIMIT $2)
      ORDER BY "price" DESC;`;
      const results = await pool.query(sqlText, [userID, limit]);

      resolve(results.rows);
    } catch (err) {
      reject(err);
    }
  });
}

// get a number of open orders in DB based on side. This will return them whether or not they are synced with CBP
// can be limited by how many should be synced, or how many should be shown on the interface 
// depending on where it is being called from
// this is very similar to the function above, but gets only one side at a time so they are easier to split
const getUnsettledTrades = (side, userID, max_trade_load) => {
  return new Promise(async (resolve, reject) => {
    let sqlText;
    // the only time 'buy' or 'sell' is passed is when the frontend is calling for all trades. 
    // can request a limited amount of data to save on network costs
    if (side == 'buy') {
      // console.log('getting buys', max_trade_load);
      // gets all unsettled buys, sorted by price
      sqlText = `SELECT * FROM "orders" 
      WHERE "side"='buy' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1
      ORDER BY "price" DESC
      LIMIT $2;`;
      pool.query(sqlText, [userID, max_trade_load])
        .then((results) => {
          // promise returns promise from pool if success
          resolve(results.rows);
        })
        .catch((err) => {
          // or promise relays errors from pool to parent
          reject(err);
        })
    } else if (side == 'sell') {
      // console.log('getting sells', max_trade_load);
      // gets all unsettled sells, sorted by price
      sqlText = `SELECT * FROM "orders" 
      WHERE "side"='sell' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1
      ORDER BY "price" ASC
      LIMIT $2;`;
      pool.query(sqlText, [userID, max_trade_load])
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

// This will get trades that have settled but not yet been flipped, meaning they need to be processed
const getSettledTrades = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      // check all trades in db that are both settled and NOT flipped
      sqlText = `SELECT * FROM "orders" WHERE "settled"=true AND "flipped"=false AND "will_cancel"=false AND "userID"=$1;`;

      const results = await pool.query(sqlText, [userID])
      // .then((results) => {
      const settled = results.rows;
      // promise returns promise from pool if success
      resolve(settled);
    } catch (err) {
      // or promise relays errors from pool to parent
      reject(err);
    }
  });
}

// get the number of open orders from the DB
const getUnsettledTradeCounts = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      // get total open buys
      let sqlTextBuys = `SELECT COUNT(*) FROM "orders" WHERE "userID"=$1 AND settled=false AND side='buy';`;

      // get total open sells
      let sqlTextSells = `SELECT COUNT(*) FROM "orders" WHERE "userID"=$1 AND settled=false AND side='sell';`;

      const totals = await Promise.all([
        pool.query(sqlTextBuys, [userID]),
        pool.query(sqlTextSells, [userID])
      ])
      const [totalOpenBuys] = totals[0].rows;
      const [totalOpenSells] = totals[1].rows;

      // combine buys and sells for total
      const totalOpenOrders = { count: Number(totalOpenBuys.count) + Number(totalOpenSells.count) };

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

// get all details of an order
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

// get the total USD that is on trade-pairs in the DB. This should be higher or the same as what is reported by CBP
// because the bot stores more "open" orders than CBP will allow for
const getSpentUSD = (userID, makerFee) => {
  return new Promise((resolve, reject) => {
    let sqlText = `SELECT sum("price"*"size"*$1)
    FROM "orders"
    WHERE "side"='buy' AND "flipped"=false AND "will_cancel"=false AND "userID"=$2;`;
    pool.query(sqlText, [makerFee, userID])
      .then((results) => {
        const [volume_usd] = results.rows;
        // promise returns promise from pool if success
        resolve(volume_usd);
      })
      .catch((err) => {
        // or promise relays errors from pool to parent
        reject(err);
      })
  });
}

// get the total BTC that is on trade-pairs in the DB. This should be higher or the same as what is reported by CBP
// because the bot stores more "open" orders than CBP will allow for
const getSpentBTC = (userID) => {
  return new Promise((resolve, reject) => {
    let sqlText = `SELECT sum("size")
    FROM "orders"
    WHERE "side"='sell' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1;`;
    pool.query(sqlText, [userID])
      .then((results) => {
        const [volume_btc] = results.rows;
        // promise returns promise from pool if success
        resolve(volume_btc);
      })
      .catch((err) => {
        // or promise relays errors from pool to parent
        reject(err);
      })
  });
}

// get a list of orders that need to be resynced with CBP
const getReorders = (userID, limit) => {
  return new Promise(async (resolve, reject) => {
    try {
      // first select the closest trades on either side according to the limit (which is in the bot settings table)
      // then select from the results any that need to be reordered
      let sqlText = `SELECT * FROM (
        (SELECT "id", "will_cancel", "userID", "price", "reorder", "userID" FROM "orders" WHERE "side"='sell' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1 ORDER BY "price" ASC LIMIT $2)
        UNION
        (SELECT "id", "will_cancel", "userID", "price", "reorder", "userID" FROM "orders" WHERE "side"='buy' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1 ORDER BY "price" DESC LIMIT $2)
        ORDER BY "price" DESC
        ) as reorders
        WHERE "reorder"=true;`;
      const results = await pool.query(sqlText, [userID, limit])
      // .then((results) => {
      const reorders = results.rows;
      // promise returns promise from pool if success
      resolve(reorders);
      // })
    } catch (err) {
      // or promise relays errors from pool to parent
      reject(err);
    }
  });
}

// check to see if a trade is being canceled by the user
// when the user kills a trade-pair, the current open order is first set to will_cancel=true 
// this is because it can take a few seconds to connect and cancel on CBP, so the order should be ignored while this is happening
// connecting to the DB and setting will_cancel to true is much faster
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

// delete a trade from the DB. Generally this should be done in combination with cancelling a trade on CB
// unless it is a settled trade
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

// get user information
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

// get all user information minus password
async function getAllUsers() {
  return new Promise(async (resolve, reject) => {
    try {
      sqlText = `SELECT "id", "username", "active", "admin", "approved", "joined_at" FROM "user";`;
      let result = await pool.query(sqlText);
      const users = result.rows;
      resolve(users);
    } catch (err) {
      reject(err);
    }
  })
}

// get all user information and settings except for the API details. 
// Keeping them separate helps prevent accidentally sending an API outside the server
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

// get the API details for a user
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

// get all bot settings
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

// turns maintenance mode on and off to stop trading on all accounts.
// This prevents loss of data if the bot needs to be shut down 
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

// get all the trades that are outside the limit of the synced orders qty setting, 
// but all still probably synced with CB (based on reorder=false)
async function getDeSyncs(userID, limit, side) {
  return new Promise(async (resolve, reject) => {
    try {
      let results = []
      if (side === 'buys') {
        const sqlTextBuys = `SELECT * FROM "orders" 
        WHERE "side"='buy' AND "flipped"=false AND "will_cancel"=false AND "reorder"=false AND "userID"=$1
        ORDER BY "price" DESC
        OFFSET $2;`;
        results = await pool.query(sqlTextBuys, [userID, limit]);
      } else {
        const sqlTextSells = `SELECT * FROM "orders" 
        WHERE "side"='sell' AND "flipped"=false AND "will_cancel"=false AND "reorder"=false AND "userID"=$1
        ORDER BY "price" ASC
        OFFSET $2;`;
        results = await pool.query(sqlTextSells, [userID, limit]);
      }
      resolve(results.rows);
    } catch (err) {
      reject(err);
    }
  })
}

// setting an order to reorder will bypass some functions in the bot that check if the order needs to be reordered.
// setting this to true for trades that are desynced from CB will save time later
async function setSingleReorder(id) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "orders" SET "reorder" = true WHERE "id" = $1;`;
      await pool.query(sqlText, [id]);
      resolve();
    } catch (err) {
      reject(err);
    }
  })
}

// this will set all trades to be reordered. Used when resyncing all orders
// all orders should be cancelled on CB when doing this
async function setReorder(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "orders" SET "reorder" = true WHERE "settled"=false AND "userID" = $1;`;
      await pool.query(sqlText, [userID]);
      resolve();
    } catch (err) {
      reject(err);
    }
  })
}

// pause the bot for a user. Actually causes the bot to ignore all functions and continue looping while doing nothing
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

// toggles the kill button on the tradelist on the interface
// turning it on will not show the kill button, preventing accidental trade-pair cancellation
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


async function setAutoSetupNumber(number, userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "user_settings" SET "auto_setup_number" = $1 WHERE "userID" = $2`;
      let result = await pool.query(sqlText, [number, userID]);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}

// update the fund balances
async function saveFunds(funds, userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const sqlText = `UPDATE "user_settings" SET "available_btc" = $1, "available_usd" = $2, "actualavailable_btc" = $3, "actualavailable_usd" = $4  WHERE "userID" = $5`;
      let result = await pool.query(sqlText, [funds.availableBTC, funds.availableUSD, funds.actualAvailableBTC, funds.actualAvailableUSD, userID]);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}

// update the fees and 30 day trade volume
async function saveFees(fees, userID) {
  return new Promise(async (resolve, reject) => {
    try {
      // console.log('saving fees', fees);
      const sqlText = `UPDATE "user_settings" SET "maker_fee" = $1, "taker_fee" = $2, "usd_volume" = $3  WHERE "userID" = $4`;
      let result = await pool.query(sqlText, [fees.maker_fee_rate, fees.taker_fee_rate, fees.usd_volume, userID]);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}


const databaseClient = {
  storeTrade: storeTrade,
  storeReorderTrade: storeReorderTrade,
  importTrade: importTrade,
  getLimitedTrades: getLimitedTrades,
  getLimitedUnsettledTrades: getLimitedUnsettledTrades,
  getUnsettledTrades: getUnsettledTrades,
  getSettledTrades: getSettledTrades,
  getUnsettledTradeCounts: getUnsettledTradeCounts,
  getSingleTrade: getSingleTrade,
  getSpentUSD: getSpentUSD,
  // getAllSpentUSD: getAllSpentUSD,
  getSpentBTC: getSpentBTC,
  getReorders: getReorders,
  deleteTrade: deleteTrade,
  getUser: getUser,
  getAllUsers: getAllUsers,
  getUserAndSettings: getUserAndSettings,
  checkIfCancelling: checkIfCancelling,
  getUserAPI: getUserAPI,
  getBotSettings: getBotSettings,
  toggleMaintenance: toggleMaintenance,
  getDeSyncs: getDeSyncs,
  setSingleReorder: setSingleReorder,
  setReorder: setReorder,
  setPause: setPause,
  setKillLock: setKillLock,
  setAutoSetupNumber: setAutoSetupNumber,
  saveFunds: saveFunds,
  saveFees: saveFees
}

module.exports = databaseClient;