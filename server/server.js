import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()

// console.log('server', server);
// const express = require('express');
import express from 'express';
import { pool } from './modules/pool.js';
// require('dotenv').config();
const app = express();
// const server = require("http").createServer(app);
import http from 'http';
const server = http.createServer(app);
const options = {
  cors: {
    origin: ["http://localhost:3000"]
  }
};
// Socket.io
// const { setupSocketIO } = require('./modules/websocket');
import { setupSocketIO } from './modules/websocket.js';

// Middleware
// const { sessionMiddleware, wrap } = require('./modules/session-middleware');
import { sessionMiddleware, wrap } from './modules/session-middleware.js';
// const passport = require('./strategies/user.strategy');
import passport from './strategies/user.strategy.js';

// Route includes
// const userRouter = require('./routes/user.router');
import userRouter from './routes/user.router.js';
// const tradeRouter = require('./routes/trade.router');
import tradeRouter from './routes/trade.router.js';
// const accountRouter = require('./routes/account.router');
import accountRouter from './routes/account.router.js';
// const ordersRouter = require('./routes/orders.router');
import ordersRouter from './routes/orders.router.js';
// const settingsRouter = require('./routes/settings.router');
import settingsRouter from './routes/settings.router.js';
// const adminRouter = require('./routes/admin.router');
import adminRouter from './routes/admin.router.js';

// bot processes

// const robot = require('./modules/robot');
import { robot } from './modules/robot.js';

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Passport Session Configuration //
app.use(sessionMiddleware);

// start up passport sessions
app.use(passport.initialize());
app.use(passport.session());

// start up socket.io 
// const io = require("socket.io")(server, options);
import { Server as socketIO } from 'socket.io';
const io = new socketIO(server, options);
// start up socket.io passport sessions
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

/* REST Routes */
app.use('/api/user', userRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/account', accountRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/admin', adminRouter);

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

export default server;