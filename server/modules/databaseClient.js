const pool = require('./pool');
const { v4: uuidv4 } = require('uuid');

// stores the details of a trade-pair. The originalDetails are details that stay with a trade-pair when it is flipped
// flipped_at is the "Time" shown on the interface. It has no other function
const storeTrade = (newOrder, originalDetails, flipped_at) => {
  return new Promise(async (resolve, reject) => {
    console.log('NEW ORDER IN STORETRADE', newOrder);
    // add new order to the database
    const sqlText = `INSERT INTO "limit_orders" 
      (
      "order_id",
      "userID",
      "original_buy_price",
      "original_sell_price"
      "trade_pair_ratio",
      "flipped_at",
      "reorder",
      "product_id",
      "coinbase_user_id",
      "base_size",
      "limit_price",
      "post_only",
      "side",
      "client_order_id",
      "next_client_order_id",
      "status",
      "time_in_force",
      "created_time",
      "completion_percentage",
      "filled_size",
      "average_filled_price",
      "fee",
      "number_of_fills",
      "filled_value",
      "pending_cancel",
      "size_in_quote",
      "total_fees",
      "previous_total_fees",
      "size_inclusive_of_fees",
      "total_value_after_fees",
      "trigger_status",
      "order_type",
      "reject_reason",
      "settled",
      "product_type",
      "reject_message",
      "cancel_message",
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37);`;
    try {
      const results = await pool.query(sqlText, [
        newOrder.order_id,
        originalDetails.userID,
        originalDetails.original_buy_price,
        originalDetails.original_sell_price,
        originalDetails.trade_pair_ratio,
        flipped_at,
        newOrder.reorder || false,
        newOrder.product_id,
        newOrder.coinbase_user_id,
        newOrder.order_configuration.limit_limit_gtc.base_size,
        newOrder.order_configuration.limit_limit_gtc.limit_price,
        newOrder.order_configuration.limit_limit_gtc.post_only,
        newOrder.side,
        newOrder.client_order_id,
        newOrder.next_client_order_id || uuidv4(),
        newOrder.status,
        newOrder.time_in_force,
        newOrder.created_time,
        newOrder.completion_percentage,
        newOrder.filled_size,
        newOrder.average_filled_price,
        newOrder.fee,
        newOrder.number_of_fills,
        newOrder.filled_value,
        newOrder.pending_cancel,
        newOrder.size_in_quote,
        newOrder.total_fees,
        // bring the fees from the previous order to the new one for more accurate profit calculation
        originalDetails.total_fees,
        newOrder.size_inclusive_of_fees,
        newOrder.total_value_after_fees,
        newOrder.trigger_status,
        newOrder.order_type,
        newOrder.reject_reason,
        newOrder.settled,
        newOrder.product_type,
        newOrder.reject_message,
        newOrder.cancel_message,
      ])
      resolve(results);
    } catch (err) {
      reject(err);
    }
  });
}

// same as above, only set reorder = true so that the bot knows not to check coinbase for it. 
// this is used in the autoSetup function to speed up the process
// const storeReorderTrade = (newOrder, originalDetails, flipped_at) => {
//   return new Promise((resolve, reject) => {
//     // add new order to the database
//     const sqlText = `INSERT INTO "orders" 
//       ("id",
//       "userID",
//       "price",
//       "size",
//       "trade_pair_ratio",
//       "side",
//       "settled",
//       "product_id",
//       "time_in_force",
//       "created_at",
//       "flipped_at",
//       "done_at",
//       "fill_fees",
//       "previous_fill_fees",
//       "filled_size",
//       "executed_value",
//       "original_buy_price",
//       "original_sell_price",
//       "reorder") 
//       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19);`;
//     pool.query(sqlText, [
//       newOrder.id,
//       originalDetails.userID,
//       newOrder.price,
//       newOrder.size,
//       originalDetails.trade_pair_ratio,
//       newOrder.side,
//       false,
//       newOrder.product_id,
//       newOrder.time_in_force,
//       newOrder.created_at,
//       flipped_at,
//       newOrder.done_at,
//       newOrder.fill_fees,
//       // bring the fees from the previous order to the new one for more accurate profit calculation
//       originalDetails.fill_fees,
//       newOrder.filled_size,
//       newOrder.executed_value,
//       originalDetails.original_buy_price,
//       originalDetails.original_sell_price,
//       true
//     ])
//       .then((results) => {
//         const success = {
//           message: `order ${newOrder.id} was successfully stored in db`,
//           results: results,
//           success: true
//         }
//         resolve(success);
//       })
//       .catch((err) => {
//         reject(err);
//       });
//   });
// }

// This function is used when importing trades from the user interface
// IT MUST USE THE USER ID FROM PASSPORT AUTHENTICATION!!!
// otherwise you could import false trades for someone else!
const importTrade = (details, userID) => {
  console.log(details.id);
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
      details.settled,
      details.product_id,
      details.time_in_force,
      details.created_at,
      details.flipped_at,
      details.done_at,
      details.fill_fees,
      details.previous_fill_fees,
      details.filled_size,
      details.executed_value,
      details.original_buy_price,
      details.original_sell_price,
      true
    ])
      .then((results) => {
        resolve(results);
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

      let sqlText = `(SELECT * FROM "limit_orders" WHERE "side"='SELL' AND "flipped"=false AND "settled"=false AND "will_cancel"=false AND "userID"=$1 ORDER BY "limit_price" ASC LIMIT $2)
      UNION
      (SELECT * FROM "limit_orders" WHERE "side"='BUY' AND "flipped"=false AND "settled"=false AND "will_cancel"=false AND "userID"=$1 ORDER BY "limit_price" DESC LIMIT $2)
      ORDER BY "price" DESC;`;
      const results = await pool.query(sqlText, [userID, limit]);

      resolve(results.rows);
    } catch (err) {
      reject(err);
    }
  });
}

// // gets all open orders in db based on a specified limit. 
// // The limit is for each side, so the results will potentially double that
// const getLimitedTrades = (userID, limit) => {
//   return new Promise(async (resolve, reject) => {
//     // get limit of buys
//     // get limit of sells
//     try {

//       let sqlText = `(SELECT * FROM "orders" WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1 ORDER BY "price" ASC LIMIT $2)
//       UNION
//       (SELECT * FROM "orders" WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1 ORDER BY "price" DESC LIMIT $2)
//       ORDER BY "price" DESC;`;
//       const results = await pool.query(sqlText, [userID, limit]);

//       resolve(results.rows);
//     } catch (err) {
//       reject(err);
//     }
//   });
// }

// get a number of open orders in DB based on side. This will return them whether or not they are synced with CBP
// can be limited by how many should be synced, or how many should be shown on the interface 
// depending on where it is being called from
// this is very similar to the function above, but gets only one side at a time so they are easier to split
const getUnsettledTrades = (side, userID, max_trade_load) => {
  return new Promise(async (resolve, reject) => {
    let sqlText;
    // the only time 'BUY' or 'SELL' is passed is when the frontend is calling for all trades. 
    // can request a limited amount of data to save on network costs
    if (side == 'BUY') {
      console.log('getting buys', max_trade_load);
      // gets all unsettled buys, sorted by price
      sqlText = `SELECT * FROM "limit_orders" 
      WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1
      ORDER BY "limit_price" DESC
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
    } else if (side == 'SELL') {
      // console.log('getting sells', max_trade_load);
      // gets all unsettled sells, sorted by price
      sqlText = `SELECT * FROM "limit_orders" 
      WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1
      ORDER BY "limit_price" ASC
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
    } else if (side == 'all') {
      // gets all unsettled trades, sorted by price
      sqlText = `SELECT * FROM "limit_orders" 
      WHERE "flipped"=false AND "will_cancel"=false AND "userID"=$1
      ORDER BY "limit_price" ASC;`;
      pool.query(sqlText, [userID])
        .then((results) => {
          // promise returns promise from pool if success
          resolve(results.rows);
        })
        .catch((err) => {
          // or promise relays errors from pool to parent
          reject(err);
        })
    } else {
      reject({ error: 'nothing' })
    }
  });
}

// This will get trades that have settled but not yet been flipped, meaning they need to be processed
const getSettledTrades = (userID) => {
  return new Promise(async (resolve, reject) => {
    try {
      // check all trades in db that are both settled and NOT flipped
      sqlText = `SELECT * FROM "limit_orders" WHERE "settled"=true AND "flipped"=false AND "will_cancel"=false AND "userID"=$1;`;

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
      let sqlTextBuys = `SELECT COUNT(*) FROM "limit_orders" WHERE "userID"=$1 AND settled=false AND side='BUY';`;

      // get total open sells
      let sqlTextSells = `SELECT COUNT(*) FROM "limit_orders" WHERE "userID"=$1 AND settled=false AND side='SELL';`;

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
    sqlText = `SELECT * FROM "limit_orders" WHERE "order_id"=$1;`;
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

// get all details of an array of orders
const getTradesByIDs = (userID, IDs) => {
  return new Promise(async (resolve, reject) => {
    let sqlText;
    // put sql stuff here, extending the pool promise to the parent function
    sqlText = `select *
    from orders
    where order_id = ANY ($1) and "userID" = $2;`;
    try {
      let result = await pool.query(sqlText, [IDs, userID]);
      resolve(result.rows);
    } catch (err) {
      reject(err);
    }
  });
}


// get the total USD that is on trade-pairs in the DB. This should be higher or the same as what is reported by CBP
// because the bot stores more "open" orders than CBP will allow for
const getSpentUSD = (userID, makerFee) => {
  return new Promise((resolve, reject) => {
    let sqlText = `SELECT sum("limit_price"*"base_size"*$1)
    FROM "limit_orders"
    WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "userID"=$2;`;
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
    FROM "limit_orders"
    WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1;`;
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
        (SELECT "order_id", "will_cancel", "userID", "price", "reorder", "userID" FROM "limit_orders" WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1 ORDER BY "price" ASC LIMIT $2)
        UNION
        (SELECT "order_id", "will_cancel", "userID", "price", "reorder", "userID" FROM "limit_orders" WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1 ORDER BY "price" DESC LIMIT $2)
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
      sqlText = `SELECT * FROM "limit_orders" WHERE "order_id"=$1;`;
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
      const queryText = `DELETE from "limit_orders" WHERE "order_id"=$1;`;
      let result = await pool.query(queryText, [id]);
      resolve(result);
    } catch (err) {
      reject(err)
    }
  });
}

async function deleteMarkedOrders(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const queryText = `DELETE from "limit_orders" WHERE "will_cancel"=true AND "userID"=$1;`;
      let result = await pool.query(queryText, [userID]);
      if (result.rowCount > 0) {
        cache.storeMessage(userID, {
          messageText: `Orders marked for cancel were canceled`,
          orderUpdate: true
        });
      }
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
        // WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1
        const sqlTextBuys = `SELECT * FROM "limit_orders" 
        WHERE "side"='BUY' AND "flipped"=false AND "will_cancel"=false AND "reorder"=false AND "userID"=$1
        ORDER BY "limit_price" DESC
        OFFSET $2;`;
        results = await pool.query(sqlTextBuys, [userID, limit]);
      } else {
        // WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "userID"=$1
        const sqlTextSells = `SELECT * FROM "limit_orders" 
        WHERE "side"='SELL' AND "flipped"=false AND "will_cancel"=false AND "reorder"=false AND "userID"=$1
        ORDER BY "limit_price" ASC
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
      const sqlText = `UPDATE "limit_orders" SET "reorder" = true WHERE "order_id" = $1;`;
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
      const sqlText = `UPDATE "limit_orders" SET "reorder" = true WHERE "settled"=false AND "userID" = $1;`;
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
      const totalVolume = Number(fees.advanced_trade_only_volume) + Number(fees.coinbase_pro_volume);
      // console.log('saving fees', fees);
      const sqlText = `UPDATE "user_settings" SET "maker_fee" = $1, "taker_fee" = $2, "usd_volume" = $3  WHERE "userID" = $4`;
      let result = await pool.query(sqlText, [fees.fee_tier.maker_fee_rate, fees.fee_tier.taker_fee_rate, totalVolume, userID]);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}

// update the fees and 30 day trade volume
async function markAsFlipped(order_id) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('marking as flipped', order_id);
      const sqlText = `UPDATE "limit_orders" SET "flipped" = true WHERE "id"=$1;`;
      let result = await pool.query(sqlText, [order_id]);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  })
}


const databaseClient = {
  storeTrade: storeTrade,
  // storeReorderTrade: storeReorderTrade,
  importTrade: importTrade,
  // getLimitedTrades: getLimitedTrades,
  getLimitedUnsettledTrades: getLimitedUnsettledTrades,
  getUnsettledTrades: getUnsettledTrades,
  getSettledTrades: getSettledTrades,
  getUnsettledTradeCounts: getUnsettledTradeCounts,
  getSingleTrade: getSingleTrade,
  getTradesByIDs: getTradesByIDs,
  getSpentUSD: getSpentUSD,
  // getAllSpentUSD: getAllSpentUSD,
  getSpentBTC: getSpentBTC,
  getReorders: getReorders,
  deleteTrade: deleteTrade,
  deleteMarkedOrders: deleteMarkedOrders,
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
  saveFees: saveFees,
  markAsFlipped: markAsFlipped
}

module.exports = databaseClient;