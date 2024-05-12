// Express
import express from 'express';
import http from 'http';
// Socket.io
// import { setupSocketIO } from './modules/websocket.js';
import { setUpWebsocket } from './modules/websocket.js';
// import { Server as socketIO } from 'socket.io';
import WebSocket from 'ws';
// Middleware
import { sessionMiddleware, wrap } from './modules/session-middleware.js';
import passport from './strategies/user.strategy.js';
// Route includes
import userRouter from './routes/user.router.js';
import tradeRouter from './routes/trade.router.js';
import accountRouter from './routes/account.router.js';
import ordersRouter from './routes/orders.router.js';
import settingsRouter from './routes/settings.router.js';
import adminRouter from './routes/admin.router.js';
import notificationsRouter from './routes/notifications.router.js';
// bot process
import { robot } from './modules/robot.js';
import { devLog } from './modules/utilities.js';
import { dbUpgrade } from './modules/databaseClient.js';

await dbUpgrade();

devLog('!!!!!!!! you are running in DEVELOPMENT mode !!!!!!!!');
// create the express app
const app = express();
const server = http.createServer(app);
// const options = {
//   cors: {
//     origin: ["http://localhost:3000","http://localhost:5173" ]
//   }
// };
// Body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session middleware
app.use(sessionMiddleware);

// Start up passport sessions
app.use(passport.initialize());
app.use(passport.session());

// // Attach the socket.io server to the express server
// const io = new socketIO(server, options);
// // Wrap the express middlewares so they can be used with socket.io
// io.use(wrap(sessionMiddleware));
// io.use(wrap(passport.initialize()));
// io.use(wrap(passport.session()));

// ws server
const wss = new WebSocket.Server({ server });

setUpWebsocket(wss);

// REST API Routes
app.use('/api/user', userRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/account', accountRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);

// Serve static files from the React app build folder
app.use(express.static('../client/dist'));

// Start the robot
robot.startSync();

// // Initialize the socket.io server
// setupSocketIO(io);

// Configure the port
const PORT = process.env.PORT || 5000;

// Start the server listening on the port
server.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});

export default server;