const express = require('express');
require('dotenv').config();
const app = express();
const server = require("http").createServer(app);
const options = {
  cors: {
    origin: ["http://localhost:3000"]
  }
};
// Socket.io
const io = require("socket.io")(server, options);
const { setupSocketIO } = require('./modules/websocket');

// Middleware
const { sessionMiddleware, wrap } = require('./modules/session-middleware');
const passport = require('./strategies/user.strategy');

// Route includes
const userRouter = require('./routes/user.router');
const tradeRouter = require('./routes/trade.router');
const accountRouter = require('./routes/account.router');
const ordersRouter = require('./routes/orders.router');
const settingsRouter = require('./routes/settings.router');

// bot processes
const robot = require('./modules/robot');

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

// Serve static files
app.use(express.static('build'));

// Start the syncOrders loop
robot.startSync();

/* socket.io */
setupSocketIO(io);

// App Set //
const PORT = process.env.PORT || 5000;

/** Listen * */
server.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
