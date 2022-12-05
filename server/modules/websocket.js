const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const fs = require('fs');
const { cache, messenger, userStorage, botSettings, cbClients } = require('./cache');
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
  // console.log(userAPI, 'api details in ws');
  const secret = userAPI.CB_SECRET;
  const key = userAPI.CB_ACCESS_KEY;

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
        } else {
          console.log(event, event.type, 'unhandled event from ws');
        }
      });
    }
  }

  function statusHandler(socketStatus) {
    console.log(socketStatus, '<-- socketStatus');
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
    //     console.log('message recieved on new socket');
    //   });
    // }
  }

  // products to subscribe to
  const products = ['BTC-USD', 'ETH-USD'];

  // setup params for the cbClient
  const setup = {
    channels: ['ticker', 'user'], // list of 
    products: products,
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
          console.log(order, 'filled order');
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
        messenger[userID].newError({
          errorData: errorData,
          errorText: errorText
        });

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
    messenger?.[userID]?.addSocket(socket);

    console.log(userStorage?.[userID]?.socketStatus, '<-- current status');

    const statMessage = {
      type: 'socketStatus',
      socketStatus: userStorage?.[userID]?.socketStatus
    }
    messenger[userID].instantMessage(statMessage)

    // userStorage?.[userID]?.socketStatus;

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