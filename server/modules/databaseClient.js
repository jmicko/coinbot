// const storeTrade = require('./storeTrade');
// const getUnsettledTrades = require('./getUnsettledTrades');
const authedClient = require('./authedClient');
const pool = require('./pool');
const robot = require('./robot');
const socketClient = require('./socketClient');

// store an array of orders that need to be updated after filling
let updateSpool = [];


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



const updateTrade = async (id) => {
  // grab an order from db that have been handled by ws trading
  // they will be settled, but need more values
  try {
    let sqlText = `SELECT * FROM orders WHERE "settled" AND "executed_value"=0 limit 1;`;
    let result = await pool.query(sqlText);
    // todo - stored as array so it can loop through them all and update without calling db as often
    updateSpool = result.rows;
    // console.log(updateSpool);
    // make sure there is something to update
    if (updateSpool.length > 0) {
      // get an up to date order object from coinbase
      cbOrder = await authedClient.getOrder(updateSpool[0].id);
      // console.log(cbOrder);
      // update the order in the db
      const queryText = `UPDATE "orders" SET "done_at" = $1, "fill_fees" = $2, "filled_size" = $3, "executed_value" = $4 WHERE "id"=$5;`;
      await pool.query(queryText, [
        cbOrder.done_at,
        cbOrder.fill_fees,
        cbOrder.filled_size,
        cbOrder.executed_value,
        cbOrder.id
      ]);
      // tell interface to update so profits can update
      socketClient.emit('update', {
        message: `an exchange was made`,
        orderUpdate: true
      });
    }
    // else {
    // console.log('no orders need updating');
    // }
  } catch (error) {
    if (error.response && error.response.statusCode && error.response.statusCode === 429) {
      console.log('status code in databaseClient updateTrade', error.response.statusCode);
      console.log('error data with databaseClient updateTrade', error.data);
      await robot.sleep(800)
      // updateTrade();
    }
    else if (error.code && error.code === 'ETIMEDOUT') {
      socketClient.emit('update', {
        message: `Connection timed out`,
        orderUpdate: false
      });
    }
    else if (error.data) {
      console.log('error data from database client updateTrade', error.data);
    }
    else {
      console.log('unknown error in database client updateTrade', error);
    }
  } finally {
    await robot.sleep(200);
    updateTrade()
  }
};

const deleteTrade = async (id) => {
  try {
    const queryText = `DELETE from "orders" WHERE "id"=$1;`;
    await pool.query(queryText, [id]);
    console.log('exchange was tossed lmao');
    socketClient.emit('update', {
      message: `exchange was tossed out of the ol' databanks`,
      orderUpdate: true
    });
  } catch (error) {
    console.log('problem in deleteTrade function in databaseClient', error);
  }
}


const databaseClient = {
  storeTrade: storeTrade,
  getUnsettledTrades: getUnsettledTrades,
  getSingleTrade: getSingleTrade,
  updateTrade: updateTrade,
  deleteTrade: deleteTrade
}

module.exports = databaseClient;