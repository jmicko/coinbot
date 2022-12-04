const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const fs = require('fs');
const { cache, messenger, userStorage, botSettings, cbClients} = require('./cache');
const databaseClient = require('./databaseClient');
const { rejectUnauthenticatedSocket } = require('./authentication-middleware');
const { sleep } = require('../../src/shared');

function startWebsocket(userID) {

  const user = cache?.getUser(userID);
  // console.log(user, 'ws user');
  // don't start ws if user is not approved and active
  if (!user?.active || !user?.approved) {
    if (user) {
      setTimeout(() => {
        const ws = startWebsocket(userID);
        // console.log(ws, 'retry ws success', user);
      }, 5000);
    }
    return { success: false }
  }
  const userAPI = cache.getAPI(userID)
  console.log(userAPI,'api details in ws');
  const secret = userAPI.CB_SECRET;
  const key = userAPI.CB_ACCESS_KEY;

  if (!secret?.length || !key?.length) {
    throw new Error('websocket connection to coinbase is missing mandatory environment variable(s)');
  }

  const products = ['BTC-USD', 'ETH-USD'];

  // Function to generate a signature using CryptoJS
  function sign(strToSign, secret) {
    const hash = CryptoJS.HmacSHA256(strToSign, secret).toString();
    return hash;
  }

  function timestampAndSign(message, channel, products = []) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const strToSign = `${timestamp}${channel}${products.join(',')}`;
    const sig = CryptoJS.HmacSHA256(strToSign, secret).toString();
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

    console.log('opening socket to coinbase for user', userID);
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
      const user = userStorage.getUser(userID);
      // const botSettings = cache.getBotSettings();
      if (!user?.active || !user?.approved || user.paused || botSettings.maintenance) {
        return
      }
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
            // console.log(event, event.type, 'event from ws');
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
    // console.log('handling snapshot');

  }

  async function handleOrdersUpdate(orders) {
    // every tick, send an update to open consoles for the user
    // console.log('handling orders update');

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

      // await sleep(1000);
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

      // console.log(socket.userID, userID)
      const msg = {
        type: 'ticker',
        ticker: ticker
      }
      messenger[userID].instantMessage(msg)

      return
    });

  }
}

// this should just update the status of each trade in the 'ordersToCheck' cached array
async function updateMultipleOrders(userID, params) {
  return new Promise(async (resolve, reject) => {
    cache.updateStatus(userID, 'start updateMultipleOrders (UMO)');
    // get the orders that need processing. This will have been taken directly from the db and include all details
    const ordersArray = params?.ordersArray
      ? params.ordersArray
      : cache.getKey(userID, 'ordersToCheck');
    // console.log(ordersArray, 'orders array in ws');
    if (ordersArray.length > 0) {
      cache.storeMessage(userID, {
        type: 'general',
        text: `There are ${ordersArray.length} orders that need to be synced`
      });
    }
    // loop over the array and update each trade
    for (let i = 0; i < ordersArray.length; i++) {
      // send client message with each loop
      cache.storeMessage(userID, {
        type: 'general',
        text: `Syncing ${i + 1} of ${ordersArray.length} orders that need to be synced`
      });
      const orderToCheck = ordersArray[i];
      try {
        cache.updateStatus(userID, 'UMO loop get order');
        // if not a reorder, look up the full details on CB
        let updatedOrder = await cbClients[userID].getOrder(orderToCheck.order_id);
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


function setupSocketIO(io) {
  console.log('setting up socket.io');

  io.use(rejectUnauthenticatedSocket);

  // handle new connections
  io.on('connection', (socket) => {
    let id = socket.id;
    const userID = socket.request.session.passport?.user;
    socket.userID = userID;
    console.log(userID, 'the user id in socketIO');
    // add the socket to the user's socket storage
    messenger[userID].addSocket(socket);

    if (!userID) {
      console.log('socket connected but client is not logged in');
    } else {
      console.log(`client connected! with user id ${userID} socket id: ${id}`);
    }

    // handle disconnect
    // socket.on("disconnect", (reason) => {
    //   const userID = socket.request.session.passport?.user;
    //   console.log(`client with id: ${id} disconnected, reason:`, reason);
    //   messenger[userID].deleteSocket(socket);
    // });

    socket.on('message', (message) => {
      // console.log(message);
      if (message === 'ping') {
        // put some timeout function in here
        // console.log(message, 'message from socket');
      }
      if (message.type === 'chat') {
        const allUsers = userStorage.getAllUsers()
        console.log(allUsers, 'ALLLLLLL OF THE user');
        allUsers.forEach(userID => {
          // console.log(user,'user to send message to', message.data);
          messenger[userID].newMessage({
            text: message.data,
            type: 'chat'
          });
        });
      }
    })


  });

  io.on('connect', (socket) => {
    const session = socket.request.session;
    console.log(`saving sid ${socket.id} in session ${session.id}`);
    session.socketId = socket.id;
    session.save();
  })

  // handle abnormal disconnects
  io.engine.on("connection_error", (err) => {
    // console.log(err.req, 'error request object');	     // the request object
    console.log(err.code, 'the error code');     // the error code, for example 1
    console.log(err.message, 'the error message');  // the error message, for example "Session ID unknown"
    console.log(err.context, 'some additional error context');  // some additional error context
  });
  console.log('socket setup done');
}

module.exports = { startWebsocket, setupSocketIO };