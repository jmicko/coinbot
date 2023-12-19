import { messenger, userStorage, botSettings, cbClients } from './cache.js';
import { databaseClient } from './databaseClient.js';
// import { rejectUnauthenticatedSocket } from './authentication-middleware.js';
// import { devLog } from '../../src/shared.js';
import { sessionMiddleware } from './session-middleware.js';
import passport from 'passport';

async function startWebsocket(userID) {

  const user = userStorage.getUser(userID);
  // don't start ws if user is not approved and active
  if (!user?.active || !user?.approved) {
    if (user) {
      setTimeout(() => {
        const ws = startWebsocket(userID);
      }, 5000);
    }
    return { success: false }
  }
  // const userAPI = cache.getAPI(userID)
  // const secret = userAPI.CB_SECRET;
  // const key = userAPI.CB_ACCESS_KEY;
  const secret = cbClients[userID].secret;
  const key = cbClients[userID].key;

  if (!secret?.length || !key?.length) {
    throw new Error('websocket connection to coinbase is missing mandatory environment variable(s)');
  }



  function messageHandler(data) {
    const user = userStorage.getUser(userID);
    if (!user?.active || !user?.approved || botSettings.maintenance) {
      return
    }
    if (data.events) {
      data.events.forEach(event => {
        if (event.tickers) {
          handleTickers(event.tickers);
        } else if (event.type === 'snapshot') {
          handleSnapshot(event);
        } else if (event.type === 'update' && event.orders) {
          handleOrdersUpdate(event.orders);
        }
      });
    }
  }

  function statusHandler(socketStatus) {
    // send status message to user
    const statMessage = {
      type: 'socketStatus',
      socketStatus: socketStatus
    };
    messenger[userID].instantMessage(statMessage);
    // save status to user storage
    userStorage[userID].setSocketStatus(socketStatus);
    // can add custom event handlers
    // if (socketStatus === 'open') {
    //   cbClients[userID].ws.on('message', function () {
    //     console.log('message received on new socket');
    //   });
    // }
  }

  // products to subscribe to
  // const products = ['BTC-USD', 'ETH-USD'];
  const products = await getProducts();
  cbClients[userID].setProducts(products);
  // devLog(cbClients[userID].products, 'cbClients[userID]');

  async function getProducts() {
    const products = await databaseClient.getActiveProducts(userID);
    // add each product_id to an array product ids
    const productIds = [];
    products.forEach(product => {
      productIds.push(product.product_id);
    });
    return productIds;
  }

  // setup params for the cbClient
  const setup = {
    channels: ['ticker', 'user'], // list of 
    // products: cbClients[userID].products,
    // reopen: false, // optional - socket will close if timed out when false
    // timeout: 1000, // optional - change how long before socket times out if no message
    messageHandler: messageHandler,
    statusHandler: statusHandler // optional - socket will pass 'closed', 'open', 'timeout', and 'reopening' to this callback
  }

  cbClients[userID].openSocket(setup)


  function handleSnapshot(event) {
    // console.log('handling snapshot');

  }

  async function handleOrdersUpdate(orders) {
    try {
      const orderIds = []
      orders.forEach(order => {
        if (order.status === 'FILLED') {
          orderIds.push(order.order_id)
        }
      })
      // find unsettled orders in the db based on the IDs array
      const unsettledOrders = await databaseClient.getUnsettledTradesByIDs(userID, orderIds);

      await updateMultipleOrders(userID, { ordersArray: unsettledOrders });
    } catch (err) {
      console.log(err, 'error in ws order update handler');
    }
  }

  function handleTickers(tickers) {
    // every tick, send an update to open consoles for the user
    tickers.forEach(ticker => {
      const msg = {
        type: 'ticker',
        ticker: ticker
      }
      messenger[userID].instantMessage(msg)
      return
    });
  }
}

// async function to get active products from db
async function getActiveProducts() {
  try {
    const products = await databaseClient.getActiveProducts();
    return products;
  } catch (err) {
    console.log(err, 'error in getActiveProducts');
  }
}


// this should just update the status of each trade in the 'ordersToCheck' cached array
async function updateMultipleOrders(userID, params) {
  return new Promise(async (resolve, reject) => {
    userStorage[userID].updateStatus('start updateMultipleOrders (UMO)');
    // get the orders that need processing. This will have been taken directly from the db and include all details
    const ordersArray = params?.ordersArray
    if (ordersArray.length > 0) {
      messenger[userID].newMessage({
        type: 'general',
        text: `There are ${ordersArray.length} orders that need to be synced`
      });
    }
    // loop over the array and update each trade
    for (let i = 0; i < ordersArray.length; i++) {
      // send client message with each loop
      messenger[userID].newMessage({
        type: 'general',
        text: `Syncing ${i + 1} of ${ordersArray.length} orders that need to be synced`
      });
      const orderToCheck = ordersArray[i];
      try {
        userStorage[userID].updateStatus('UMO loop get order');
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
        userStorage[userID].updateStatus('error in UMO loop');
        // handle not found order
        let errorText = `Error updating order details`
        console.log(err, 'error in updateMultipleOrders loop');
        messenger[userID].newError({
          errorData: orderToCheck,
          errorText: errorText
        });

      } // end catch
    } // end for loop
    userStorage[userID].updateStatus('UMO all done');
    resolve();
  })
}

function setUpWebsocket(wss) {

  wss.on('connection', (ws, req) => {
    console.log('================NEW WEBSOCKET CONNECTION================');
    // Use the req object to access session and passport data
    sessionMiddleware(req, {}, () => {

      passport.initialize()(req, {}, () => {

        passport.session()(req, {}, () => {

          const session = req.session;
          const user = req.user;
          const id = session.id;
          const userID = user?.id;
          ws.userID = userID;

          messenger?.[userID]?.addSocket(ws);

          const statMessage = {
            type: 'socketStatus',
            socketStatus: userStorage?.[userID]?.socketStatus
          }
          messenger[userID].instantMessage(statMessage)

          if (!userID) {
            console.log('socket connected but client is not logged in');
            // disconnect the socket if the user is not logged in
            ws.disconnect();
          } else {
            console.log(`client connected! with user id ${userID} socket id: ${id}`);
          }

          // send a ping to the client every 5 seconds
          const pingInterval = setInterval(() => {
            ws.send(JSON.stringify({ type: 'ping', data: 'ping' }));
          }, 5000);

          // server side pong handler
          ws.on('message', (data) => {
            try {
              data = JSON.parse(data);
              if (data.type === 'pong') {
                // console.log(data, 'pong from client');
              } else {
                console.log(data, 'message from socket');
              }
            } catch (err) {
              console.log(err, 'error parsing ws message');
            }
          });

          ws.on('close', () => {
            const userID = req.session.passport?.user;
            console.log(`client:${user.username} with id: ${id} disconnected`);
            messenger[userID].deleteSocket(ws);
            clearInterval(pingInterval);
          });

          ws.send(JSON.stringify({
            type: 'message',
            data: 'Hello! Message from server!!'
          }));
        });
      });
    });
  });


  console.log('websocket setup done');
}

export {
  startWebsocket,
  // setupSocketIO,
  setUpWebsocket
};