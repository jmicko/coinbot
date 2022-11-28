// JS Example for subscribing to a channel
/* eslint-disable */
const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const fs = require('fs');
const cache = require('./cache');
const databaseClient = require('./databaseClient');
const coinbaseClient = require('./coinbaseClient');
const { wrap, sessionMiddleware } = require('./session-middleware');

function startWebsocket(userID) {
  const userAPI = cache.getAPI(userID)
  const secret = userAPI.CB_SECRET;
  const key = userAPI.CB_ACCESS_KEY;

  if (!secret.length || !key.length) {
    throw new Error('missing mandatory environment variable(s)');
  }

  const products = ['BTC-USD', 'ETH-USD'];

  // Function to generate a signature using CryptoJS
  function sign(str, secret) {
    const hash = CryptoJS.HmacSHA256(str, secret);
    return hash.toString();
  }

  function timestampAndSign(message, channel, products = []) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const strToSign = `${timestamp}${channel}${products.join(',')}`;
    const sig = sign(strToSign, secret);
    return { ...message, signature: sig, timestamp: timestamp };
  }

  function subscribeToProducts(products, channelName, ws) {
    // console.log('products: %s', products.join(','));
    const message = {
      type: 'subscribe',
      channel: channelName,
      api_key: key,
      product_ids: products,
      user_id: '',
    };
    const subscribeMsg = timestampAndSign(message, channelName, products);
    ws.send(JSON.stringify(subscribeMsg));
  }

  function unsubscribeToProducts(products, channelName, ws) {
    const message = {
      type: 'unsubscribe',
      channel: channelName,
      api_key: key,
      product_ids: products,
    };
    const subscribeMsg = timestampAndSign(message, channelName, products);
    ws.send(JSON.stringify(subscribeMsg));
  }

  // The base URL of the API
  const WS_API_URL = 'wss://advanced-trade-ws.coinbase.com';

  open();


  function open() {

    function timer() {
      clearTimeout(this.pingTimeout);
      // Use `WebSocket#terminate()`, which immediately destroys the connection,
      // instead of `WebSocket#close()`, which waits for the close timer.
      // Delay should be equal to the interval at which your server
      // sends out pings plus a conservative assumption of the latency.
      this.pingTimeout = setTimeout(() => {
        console.log('ending socket after timeout');
        this.terminate();
      }, 10000);
    }

    function ordersInterval() {
      clearInterval(this.getOrders);
      this.getOrders = setInterval(() => {
        console.log('getting orders');
        unsubscribeToProducts(products, 'user', ws);
        subscribeToProducts(products, 'user', ws);
      }, 10000);
    }

    console.log('OPENING');
    let ws = new WebSocket(WS_API_URL);

    ws.on('open', function () {
      console.log('Socket open!');
      subscribeToProducts(products, 'ticker', ws);
      subscribeToProducts(products, 'user', ws);
    });

    ws.on('close', function () {
      console.log('Socket was closed');

      fs.appendFile('ws-connection-log.txt', `${new Date}  \r\nUser ID: ${userID} \r\nattempting to reopen socket\r\n\r\n`, (err) => {
        // In case of a error log err.
        if (err) console.log(err, 'error writing to file');;
      });
      // always reopen the socket if it closes
      setTimeout(() => {
        open();
      }, 1000);

    });

    ws.on('error', (error) => {
      console.log(error, 'error on ws connection');
    });

    ws.on('message', function (data) {
      const parsedData = JSON.parse(data);
      // if (parsedData.channel) {
      //   console.log(parsedData.channel, 'channel from ws', parsedData);
      // }
      if (parsedData.events) {
        parsedData.events.forEach(event => {
          if (event.tickers) {
            // console.log(event, event.type, 'event from ws');
            handleTickers(event.tickers);
          } else if (event.type === 'snapshot') {
            handleSnapshot(event);
          } else if (event.type === 'update' && event.orders) {
            handleOrdersUpdate(event.orders);
          } else {
            console.log(event, event.type, 'event from ws');
          }
        });
      }
      // console.log('');
    });


    ws.on('open', timer);
    // ws.on('open', ordersInterval);
    ws.on('message', timer);
    ws.on('close', function clear() {
      clearTimeout(this.pingTimeout);
      // clearInterval(this.getOrders)
    });

  }

  function handleSnapshot(event) {
    // every tick, send an update to open consoles for the user
    console.log('handling snapshot');

  }

  async function handleOrdersUpdate(orders) {
    // every tick, send an update to open consoles for the user
    console.log('handling orders update');

    // update should look like this:
    // {
    //   type: 'update',
    //   orders: [
    //     {
    //       order_id: 'b2908b46-d2ca-461b-9c75-4c024a8790ed',
    //       client_order_id: 'd878c77e-7ade-425c-b2a7-8c84a8101353',
    //       cumulative_quantity: '0.00029411',
    //       leaves_quantity: '0',
    //       avg_price: '16554.17',
    //       total_fees: '0.01217186734675',
    //       status: 'FILLED'
    //     }
    //   ]
    // } update event from ws
    try {

      const orderIds = []
      orders.forEach(order => {
        if (order.status === 'FILLED') {
          orderIds.push(order.order_id)
          console.log(order, 'filled order');
        }
      })

      await sleep(1000);
      // find unsettled orders in the db based on the IDs array
      const unsettledOrders = await databaseClient.getUnsettledTradesByIDs(userID, orderIds);

      await updateMultipleOrders(userID, { ordersArray: unsettledOrders });
    } catch (err) {
      console.log(err, 'error in ws order update handler');
    }

  }

  function handleTickers(tickers) {
    // every tick, send an update to open consoles for the user
    // console.log('handling tickers');
    tickers.forEach(ticker => {
      cache.sockets.forEach(socket => {
        // find each open socket for the user
        if (socket.userID === userID) {
          // console.log(socket.userID, userID)
          const msg = {
            type: 'ticker',
            ticker: ticker
          }
          // send the message
          socket.emit('message', msg);
        }
      })
      return
    });

  }
}// this should just update the status of each trade in the 'ordersToCheck' cached array
async function updateMultipleOrders(userID, params) {
  return new Promise(async (resolve, reject) => {
    cache.updateStatus(userID, 'start updateMultipleOrders (UMO)');
    // get the orders that need processing. This will have been taken directly from the db and include all details
    const ordersArray = params?.ordersArray
      ? params.ordersArray
      : cache.getKey(userID, 'ordersToCheck');
    console.log(ordersArray, 'orders array in ws');
    if (ordersArray.length > 0) {
      cache.storeMessage(userID, { messageText: `There are ${ordersArray.length} orders that need to be synced` });
    }
    // loop over the array and update each trade
    for (let i = 0; i < ordersArray.length; i++) {
      cache.storeMessage(userID, { messageText: `Syncing ${i + 1} of ${ordersArray.length} orders that need to be synced` });
      // set up loop
      const orderToCheck = ordersArray[i];
      // set up loop DONE
      try {
        cache.updateStatus(userID, 'UMO loop get order');
        // if not a reorder, look up the full details on CB
        let updatedOrder = await coinbaseClient.getOrderNew(userID, orderToCheck.order_id);
        // if it was cancelled, set it for reorder
        if (updatedOrder.order.status === 'CANCELLED') {
          console.log('was canceled but should not have been!')
          updatedOrder.order.reorder = true;
        }
        // then update db with current status
        await databaseClient.updateTrade(updatedOrder.order);
      } catch (err) {
        cache.updateStatus(userID, 'error in UMO loop');
        // handle not found order
        let errorText = `Error updating order details`
        console.log(err, 'error in updateMultipleOrders loop');
        cache.storeError(userID, {
          errorData: orderToCheck,
          errorText: errorText
        })
      } // end catch
    } // end for loop
    cache.updateStatus(userID, 'UMO all done');
    resolve();
  })
}

// function to pause for x milliseconds in any async function
function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function heartBeat(userID) {
  const loopNumber = cache.getLoopNumber(userID);
  const botSettings = cache.getKey(0, 'botSettings');

  cache.sockets.forEach(socket => {
    // find all open sockets for the user
    if (socket.userID === userID) {
      // console.log(loopNumber, botSettings.full_sync, loopNumber % botSettings.full_sync + 1)
      const msg = {
        type: 'heartbeat',
        count: loopNumber % botSettings.full_sync + 1
      }
      socket.emit('message', msg);
    }
  })

}

function getOpenOrders(userID) {
  return new Promise(async (resolve, reject) => {
    const userAPI = cache.getAPI(userID)
    const secret = userAPI.CB_SECRET;
    const key = userAPI.CB_ACCESS_KEY;

    if (!secret.length || !key.length) {
      throw new Error('missing mandatory environment variable(s)');
    }

    const products = ['BTC-USD', 'ETH-USD'];

    // Function to generate a signature using CryptoJS
    function sign(str, secret) {
      const hash = CryptoJS.HmacSHA256(str, secret);
      return hash.toString();
    }

    function timestampAndSign(message, channel, products = []) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const strToSign = `${timestamp}${channel}${products.join(',')}`;
      const sig = sign(strToSign, secret);
      return { ...message, signature: sig, timestamp: timestamp };
    }

    function subscribeToProducts(products, channelName, ws) {
      // console.log('products: %s', products.join(','));
      const message = {
        type: 'subscribe',
        channel: channelName,
        api_key: key,
        product_ids: products,
        user_id: '',
      };
      const subscribeMsg = timestampAndSign(message, channelName, products);
      ws.send(JSON.stringify(subscribeMsg));
    }

    // The base URL of the API
    const WS_API_URL = 'wss://advanced-trade-ws.coinbase.com';

    open();

    function open() {

      function timer() {
        clearTimeout(this.pingTimeout);
        this.pingTimeout = setTimeout(() => {
          console.log('ending socket after timeout');
          reject({
            response: {
              status: 503,
              statusText: 'socket timeout',
              data: {
                error: 'socket closed',
                error_details: 'socket closed after timeout',
                message: 'socket timeout'
              }
            }
          });
          this.terminate();
        }, 5000);
      }

      let ws = new WebSocket(WS_API_URL);

      ws.on('open', function () {
        // console.log('Get orders socket open!');
        subscribeToProducts(products, 'user', ws);
      });

      ws.on('error', function (err) {
        console.log('get orders websocket error!');
        reject({
          response: {
            status: 503,
            statusText: 'unknown error',
            data: {
              error: 'unknown error',
              error_details: 'unknown error',
              message: 'unknown error'
            },
            error: err
          }
        });
      });

      ws.on('message', function (data) {
        const parsedData = JSON.parse(data);

        if (parsedData.events) {
          parsedData.events.forEach(event => {
            if (event.type === 'snapshot') {
              handleSnapshot(event);
            }
          });
        }
      });

      function handleSnapshot(event) {
        if (event.orders) {
          resolve(event.orders);
          ws.close();
        }
      }

      ws.on('open', timer);
      ws.on('close', function clear() {
        clearTimeout(this.pingTimeout);
      });
    }
  })
}

function setupSocketIO(io) {
  console.log('setting up socket.io');

  // auth
  // use wrap to wrap socket with express middleware
  io.use(wrap(sessionMiddleware));

  // handle new connections
  io.on('connection', (socket) => {
    let id = socket.id;
    // console.log(socket.request.session.passport?.user,'user id');
    const userID = socket.request.session.passport?.user;
    socket.userID = userID
    cache.sockets.add(socket)
    // cache.sockets.add(3)

    console.log(`client with id: ${id} connected!`);
    if (!userID) {
      console.log('client is not logged in');
    } else {
      console.log(`user id ${userID} is logged in!`);
    }

    // handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`client with id: ${id} disconnected, reason:`, reason);
      cache.sockets.delete(socket);
    });

  });

  // handle abnormal disconnects
  io.engine.on("connection_error", (err) => {
    // console.log(err.req, 'error request object');	     // the request object
    console.log(err.code, 'the error code');     // the error code, for example 1
    console.log(err.message, 'the error message');  // the error message, for example "Session ID unknown"
    console.log(err.context, 'some additional error context');  // some additional error context
  });
  console.log('socket setup done');
}

module.exports = { startWebsocket, getOpenOrders, setupSocketIO };