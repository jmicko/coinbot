const express = require('express');
require('dotenv').config();
const app = express();
const server = require("http").createServer(app);
const options = {
  cors: {
    origin: ["http://localhost:3000"]
  }
};
const io = require("socket.io")(server, options);
const sessionMiddleware = require('./modules/session-middleware');
const passport = require('./strategies/user.strategy');
const cbWebsocket = require("./modules/cbWebsocket");

// Route includes
const userRouter = require('./routes/user.router');
const tradeRouter = require('./routes/trade.router');
const accountRouter = require('./routes/account.router');
const ordersRouter = require('./routes/orders.router');
const databaseClient = require('./modules/databaseClient');

const trader = require('./modules/trader');
const socketClient = require('./modules/socketClient');
const robot = require('./modules/robot');

// start the trader
trader();
// sync all trades on start, then set to sync every 5 minutes
// robot.syncOrders();
setInterval(() => {
  robot.syncOrders;
}, 300000);


// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport Session Configuration //
app.use(sessionMiddleware);

// start up passport sessions
app.use(passport.initialize());
app.use(passport.session());

/* REST Routes */
app.use('/api/user', userRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/account', accountRouter);
app.use('/api/orders', ordersRouter);
// app.use('/api/bot', tradeRouter);

/* socket.io */
// this triggers on a new client connection
/* websocket is being used to alert when something has happened, but currently does not 
    authenticate, and should not be used to send sensitive data */
io.on('connection', (socket) => {
  let id = socket.id;
  console.log(`client with id: ${id} connected!`);
  // console.log('the socket is', socket.handshake);
  // message to client confirming connection
  socket.emit('message', { message: 'welcome!' });
  socket.emit('message', { message: 'trade a coin or two!' });
  socket.emit('message', {
    connection: {
      localWebsocket: true
    }
  });

  // relay updates from the loop about trades that are being checked
  socket.on('message', (message) => {
    // socket.broadcast.emit('message', { message: 'welcome!' });
    // console.log(message.message);
    socket.broadcast.emit('message', message);
  })

  // relay updates from the loop about trades that are being checked
  socket.on('update', (message) => {
    // socket.broadcast.emit('message', { message: 'welcome!' });
    // console.log(message);
    socket.broadcast.emit('update', message);
  })

  socket.on('exchangeUpdate', (trade) => {
    // socket.broadcast.emit('message', { message: 'welcome!' });
    socket.broadcast.emit('exchangeUpdate', trade);
    // console.log('server got a trade exchange update!', trade);
  })

  socket.on("disconnect", (reason) => {
    console.log(`client with id: ${id} disconnected, reason:`, reason);
  });

});

// handle abnormal disconnects
io.engine.on("connection_error", (err) => {
  console.log(err.req);	     // the request object
  console.log(err.code);     // the error code, for example 1
  console.log(err.message);  // the error message, for example "Session ID unknown"
  console.log(err.context);  // some additional error context
});
/* end socket.io */

// Coinbase Websocket stuff

cbWebsocket.cbWebsocket.on('open', data => {
  robot.cbWebsocketConnection = true;
  console.log('cb ws connected!');
});
cbWebsocket.cbWebsocket.on('message', data => {
  // console.log('cb ws connected!');
  /* work with data */
  // console.log(data.type);
  // if (data.type === 'l2update') {
  // console.log(data.type);
  cbWebsocket.handleUpdate(data)
  // }
});
cbWebsocket.cbWebsocket.on('error', err => {
  /* handle error */
  console.log('coinbase websocket error', err);
});
cbWebsocket.cbWebsocket.on('close', (message) => {
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
    cbWebsocket.cbWebsocket.connect();
    console.log('cb ws attempted to reconnect');
  } else {
    // wait 15 seconds to outlast timeouts and try again
    setTimeout(() => {
      reconnect();
    }, 15000);
  }
}

// End Coinbase Websocket stuff


// Serve static files
app.use(express.static('build'));

// App Set //
const PORT = process.env.PORT || 5000;

/** Listen * */
server.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
