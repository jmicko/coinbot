const pool = require('./pool');
const authedClient = require('./authedClient');
const databaseClient = require('./databaseClient/databaseClient')
// const storeTrade = require('./databaseClient/storeTrade');

// The express server itself can use the socket.io-client package to call the ws connections
const io = require("socket.io-client");
const ENDPOINT = "http://localhost:5000";
const socket = io(ENDPOINT);

// sleeper function to slow down the loop
// can be called from an async function and takes in how many milliseconds to wait
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// boolean variable to turn coinbot on and off
let coinbot = false;
let count = 0;
let loopSwitch = false;


// toggle coinbot on and off
function toggleCoinbot() {
  // toggle coinbot boolean
  coinbot = !coinbot;
  // if the bot should now be coinbot, it starts the trade loop
  coinbot
    ? theLoop()
    : console.log('bot is not coinbot');
}

/* our functions should be returning things instead of calling a function at the end.
   that way they won't be chained together and will be easier to use separately.
   the functions we are calling at the end should actually be calling that function and using what is returned. */

/* todo - need to make this faster, and more efficient by making fewer calls to CB API
- before loop
-- get all open orders from db
-- get all open orders from cb api instead of getting them one at a time in the loop
-- pass the cbOrders array into the loop
-- inside loop (pass in the dbOrders and the cbOrders array)
-- for each dbOrder (same as we have it)
-- check if the order id exists in the cbOrders array
-- if it does not, it has probably settled
-- make an api call to get that order info
-- if CB confirms it is settled, make the new trade, mark in db, etc
-- we need to figure out error checking.
-- if not settled per cb, continue through the loop
      */




const theLoop = async (dbOrders) => {
  //  always check if coinbot should be running
  if (coinbot) {
    console.log('bot is coinbot');
    // wait for 1/10th of a second between each full loop call to prevent too many
    // need to make fewer than 15/sec
    await sleep(100);
    // make variables to store the results from the 2 api calls, 
    // and one for orders that should be settled but need to be checked individually
    let dbOrders = [],
      cbOrders = [],
      odersToCheck = [];
    // get all open orders from db
    databaseClient.getUnsettledTrades()
      .then((results) => {
        // store the orders in the dbOrders array so they can be compared later
        dbOrders = results.rows;
        console.log(dbOrders);
      })
      .then(() => {
        // get all open orders from coinbase api
      })
      .catch(error => {
        console.log('error fetching orders from database', error);
      });
    // now get all open orders from coinbase

    // - get all open orders from cb api instead of getting them one at a time in the loop

  }
}


const oldtheLoop = async (dbOrders) => {
  loopSwitch = true;
  for (const dbOrder of dbOrders) {
    // need to stop the loop if coinbot is off
    if (coinbot) {
      // wait for 1/10th of a second between each api call to prevent too many
      await sleep(100);
      socket.emit('checkerUpdate', dbOrder);
      // pull the id from coinbase inside the loop and store as object
      // send request to coinbase API to get status of a trade
      await authedClient.getOrder(dbOrder.id)
        // eslint-disable-next-line no-loop-func
        .then(cbOrder => {
          // check if the CB order has been settled yet
          // console.log('this is the order settled value you asked for', cbOrder.settled, count);
          // brother may I have some loops
          if (cbOrder.settled) {
            // if it has been settled, send a buy/sell order to CB
            // assume selling, but if it was just sold, change side to buy
            // the price to sell at is calculated to be 3% higher than the buy price
            let side = 'sell';
            let price = ((Math.round((dbOrder.price * 1.03) * 100)) / 100);
            if (dbOrder.side === 'sell') {
              // the price to buy at is calculated to be 3% lower than the sell price
              // todo - store original buy price in db, and always use it as the buy price 
              // to avoid price creep from rounding issues
              side = 'buy';
              price = ((Math.round((dbOrder.price / 1.03) * 100)) / 100);
              console.log('buying');
            } else {
              console.log('selling');
            }
            const tradeDetails = {
              side: side,
              price: price, // USD
              size: dbOrder.size, // BTC
              product_id: 'BTC-USD',
            };
            // function to send the order with the CB API to CB and place the trade
            authedClient.placeOrder(tradeDetails)
              .then(pendingTrade =>
                // after trade is placed, store the returned pending trade values in the database
                storeTrade(pendingTrade)
              )
              .then(result => { console.log('just got back from storing this in db:', result) })

            // after order succeeds, update settled in DB to be TRUE
            const queryText = `UPDATE "orders" SET "settled" = NOT "settled" WHERE "id"=$1;`;
            pool.query(queryText, [cbOrder.id])
              .then(() => { console.log('order updated'); })
              .catch(error => {
                console.log('houston we have a problem on line 88 in the loop', error);
              });
          }
          count++;
        })
        .catch(error => {
          console.log('there was an error fetching the orders', error)
        })
    };
  }
  loopSwitch = false;
  count = 0;
}


// Wait, what does this even do?
// it gets orders from the db and tries to call the loop every second
// there's gotta be a better way lol.
// the loop can just call itself at the end of the loop can't it?
// the loop can be one function and the toggle can be another. call it first from the toggle and then call itself
function oldtradeLoop() {
  if (coinbot) {
    // if bot should be coinbot, also check if the loop from the theLoop loop is running.
    // if the theLoop loop is not running, bot will wait a second and try again
    if (!loopSwitch) {
      // pull all "unsettled" orders from DB
      const sqlText = `SELECT * FROM "orders" WHERE "settled"=FALSE;`;
      pool.query(sqlText)
        // pass the DB orders to a function to compare them to the orders in CB
        .then((result) => theLoop(result.rows))
        .catch(error => {
          console.log('error fetching orders from database', error);
        });
    }
    // if the bot should still be coinbot, it waits 1 second and then calls itself again
    // by checking coinbot at the beginning of the function, and calling itself at the end,
    // the code won't run if the toggle is turned off in the middle, but it will still finish a cycle
    setTimeout(() => {
      tradeLoop();
    }, 1000);
  }
}

module.exports = {
  toggleCoinbot: toggleCoinbot,
  theLoop: theLoop,
};