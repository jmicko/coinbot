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
const { sessionMiddleware, wrap } = require('./modules/session-middleware');
const passport = require('./strategies/user.strategy');

// Route includes
const userRouter = require('./routes/user.router');
const tradeRouter = require('./routes/trade.router');
const accountRouter = require('./routes/account.router');
const ordersRouter = require('./routes/orders.router');
const settingsRouter = require('./routes/settings.router');

const robot = require('./modules/robot');
const coinbaseClient = require('./modules/coinbaseClient');
const cache = require('./modules/cache');
// const { wrap } = require('module');

// Start the syncOrders loop
robot.startSync();

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
app.use('/api/settings', settingsRouter);

/* socket.io */
// *** SOCKET AUTH *** //
// use wrap to wrap socket with express middleware
io.use(wrap(sessionMiddleware));
// this triggers on a new client connection
/* websocket is being used to alert when something has happened, but currently does not 
    authenticate, and should not be used to send sensitive data. Jk it should be authenticating now */
// const sockets = new Set();

setInterval(() => {
  // console.log(cache.sockets,'sockets set');
  // cache.sockets.forEach(socket => console.log(socket.userID))
}, 2000);
io.on('connection', (socket) => {
  let id = socket.id;
  // console.log(socket.request.session.passport?.user,'user id');
  const userID = socket.request.session.passport?.user;
  socket.userID = userID
  cache.sockets.add(socket)
  // cache.sockets.add(3)

  if (!userID) {
    console.log('user is not logged in');
    // socket.disconnect();
  } else {
    console.log(`user id ${userID} connected!`);
    // socket.disconnect();
  }

  console.log(`client with id: ${id} connected!`);
  // console.log('the socket is', socket.handshake);
  // message to client confirming connection
  // socket.emit('message', { message: 'welcome!' });
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
/* end socket.io */

// Serve static files
app.use(express.static('build'));

// App Set //
const PORT = process.env.PORT || 5000;

/** Listen * */
server.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
