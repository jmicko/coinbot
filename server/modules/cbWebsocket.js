const CoinbasePro = require('coinbase-pro');
const pool = require('./pool');
const authedClient = require('./authedClient');
const socketClient = require('./socketClient');
const robot = require('./robot');
const databaseClient = require('./databaseClient');

// CONNECTION SETUP

const cbWebsocket = new CoinbasePro.WebsocketClient(
  ['BTC-USD'],
  // todo - change url to not sandbox once well tested
  process.env.WS_URL || 'wss://ws-feed-public.sandbox.pro.coinbase.com',
  {
    key: process.env.SANDBOXKEY,
    secret: process.env.SANDBOXSECRET,
    passphrase: process.env.SANDBOXPASSWORD,
    auto_reconnect: true,
  },
  { channels: ['user'] }
);

cbWebsocket.on('open', data => {
  robot.cbWebsocketConnection = true;
  console.log('cb ws connected!');
});

cbWebsocket.on('message', data => {
  // console.log('cb ws connected!');
  /* work with data */
  // console.log(data.type);
  // if (data.type === 'l2update') {
  // console.log(data.type);
  handleUpdate(data)
  // }
});

cbWebsocket.on('error', err => {
  /* handle error */
  console.log('coinbase websocket error', err);
});

cbWebsocket.on('close', (message) => {
  /* ... */
  robot.cbWebsocketConnection = false;
  console.log('bye', message);
  // tell the front end that the connection has been lost
  socketClient.emit('message', {
    message: `cb websocket disconnected`,
    cbWebsocket: false
  });
  // attempt to reconnect
  reconnect();
});

function reconnect() {
  if (robot.cbWebsocketConnection === false) {
    cbWebsocket.connect();
    console.log('cb ws attempted to reconnect');
  } else {
    // wait 15 seconds to outlast timeouts and try again
    setTimeout(() => {
      reconnect();
    }, 15000);
  }
}

// END OF CONNECTION SETUP

function handleUpdate(data) {
  // console.log('heartbeat data', data);
  // if (data.type != 'heartbeat') {
  //   console.log('this is not heartbeat data', data);
  // }
  if (data.profile_id && data.type !== 'heartbeat') {
    (data.reason === 'filled')
      ? handleFilled(data, 0)
      : (data.reason === 'canceled')
        ? handleCanceled(data, 0)
        : console.log('type from Coinbase websocket feed:', data.type);
  }
}

async function handleCanceled(canceledOrder, repeats) {
  console.log('cb ws sees a canceled order');
  try {
    // need to check if order is in db before deleting it
    // websocket is faster and will report orders that are cancelled when placed
    // coinbot will try to delete from db
    // then the REST api will come back with the order number and store it, even though it is cancelled
    console.log('order was deleted from cb', canceledOrder);
    const queryText = `DELETE from "orders" WHERE "id"=$1;`;
    const response = await pool.query(queryText, [canceledOrder.order_id]);
    console.log('response from cancelling order and deleting from db', response.rowCount);
    if (response.rowCount === 0) {

      repeats++;
      // wait a little longer with each try
      await robot.sleep(repeats * 1000)
      if (repeats < 5) {
        handleCanceled(canceledOrder, repeats)
      } else{
        console.log('order was not found in db when canceled');
      }


    } else {

      console.log('deleted from db as well');
      // send notification as an error to the client
      // todo - only send this if it was not supposed to be cancelled
      socketClient.emit('message', {
        error: `order cancelled ${JSON.stringify(canceledOrder)}`,
        message: `order was canceled on Coinbase`,
        orderUpdate: true
      });
    }
  } catch (err) {
    if (err.data && err.data.message) {
      console.log('err message, trade router DELETE:', err.data.message);
      // orders that have been canceled are deleted from coinbase and return a 404.
      // error handling should delete them from db and not worry about coinbase since there is no other way to delete
      // but also send one last delete message to Coinbase just in case it finds it again, but with no error checking
      if (err.data.message === 'order not found') {
        console.log('order not found in account. deleting from db', orderId);
        const queryText = `DELETE from "orders" WHERE "id"=$1;`;
        await pool.query(queryText, [orderId])
        console.log('exchange was tossed lmao');
        socketClient.emit('message', {
          message: `exchange was tossed out of the ol' databanks`,
          orderUpdate: true
        });
      }
    } else {
      console.log('something failed', err);
      res.sendStatus(500)
    }
  } finally {
    console.log('order cancellation handled', canceledOrder);
  }
}

async function handleFilled(cbOrder, repeats) {
  const dbOrder = await databaseClient.getSingleTrade(cbOrder.order_id);
  if (dbOrder?.id) {
    // const dbOrder = dbOrder[0];

    // changing to just mark as settled in db. Then need to make a loop to find all orders that are settled and not flipped, and flip them
    // robot.addToTradeQueue(dbOrder);
    settleInDB(dbOrder, cbOrder);
  } else {
    // when an order is first placed, it takes time to store in db and may return nothing
    // if that is the case, call this function again
    // however if a random order is filled that was never in the db, this makes an infinite loop
    // so only repeat this action 10 times then give up because it def is not there
    repeats++;
    console.log('repeats', repeats);
    // wait a little longer with each try
    await robot.sleep(repeats * 100)
    if (repeats < 10) {
      handleFilled(cbOrder, repeats);
    }
  }
}

async function settleInDB(dbOrder, cbOrder) {
  let fullSettledDetails = await authedClient.getOrder(cbOrder.order_id);
  console.log('here are the full settled order details', fullSettledDetails);
  console.log('this order will be marked as settled in db', dbOrder, cbOrder);
  const queryText = `UPDATE "orders" SET "settled" = true, "done_at" = $1, "fill_fees" = $2, "filled_size" = $3, "executed_value" = $4 WHERE "id"=$5;`;
      let result = await pool.query(queryText, [
        fullSettledDetails.done_at,
        fullSettledDetails.fill_fees,
        fullSettledDetails.filled_size,
        fullSettledDetails.executed_value,
        cbOrder.order_id
      ]);
      console.log('result of updating order from cbWebsocket', result);
}

module.exports = {
  cbWebsocket,
  handleUpdate: handleUpdate,
  reconnect: reconnect
};