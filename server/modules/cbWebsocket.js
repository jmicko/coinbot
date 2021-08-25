const CoinbasePro = require('coinbase-pro');
const pool = require('./pool');
const authedClient = require('./authedClient');
const socketClient = require('./socketClient');
const robot = require('./robot');
const databaseClient = require('./databaseClient');

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

const handleUpdate = (data) => {
  // console.log('heartbeat data', data);
  // if (data.type != 'heartbeat') {
  //   console.log('this is not heartbeat data', data);
  // }
  if (data.profile_id && data.type !== 'heartbeat') {
    (data.reason === 'filled')
      ? handleFilled(data, 0)
      : (data.reason === 'canceled')
        ? handleCanceled(data)
        : console.log('reason from Coinbase websocket feed:', data);
  }
}

const handleCanceled = async (canceledOrder) => {
  console.log('cb ws sees a canceled order');
  try {
    console.log('order was deleted from cb', canceledOrder);
    const queryText = `DELETE from "orders" WHERE "id"=$1;`;
    await pool.query(queryText, [canceledOrder.order_id]);
    console.log('deleted from db as well');
    // send notification as an error to the client
    // todo - only send this if it was not supposed to be cancelled
    socketClient.emit('message', {
      error: `order cancelled ${JSON.stringify(canceledOrder)}`,
      message: `order was canceled on Coinbase`,
      orderUpdate: true
    });
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

const handleFilled = async (cbOrder, repeats) => {
  const dbOrderRows = await databaseClient.getSingleTrade(cbOrder.order_id);
  if (dbOrderRows[0] && dbOrderRows[0].id) {
    const dbOrder = dbOrderRows[0];
    robot.addToTradeQueue(dbOrder);
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

module.exports = {
  cbWebsocket,
  handleUpdate: handleUpdate
};