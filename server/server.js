const express = require('express');
const app = express();
// const http = require('http');

const server = require("http").createServer(app);

const options = {
  cors: {
    origin: ["http://localhost:3000"]
  }
};
const io = require("socket.io")(server, options);

require('dotenv').config();
const bodyParser = require('body-parser');
const theLoop = require('./modules/theLoop')

// Route includes
const tradeRouter = require('./routes/trade.router');


// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


/* Routes */
app.use('/api/trade', tradeRouter);

// socket.io

let transaction = theLoop.getTransaction();


console.log(transaction);
// this triggers on a new client connection
io.on('connection', (socket) => {

  let id = socket.id;

  console.log('a user connected. id:', id);

  // send the socket to the loop by storing it in the cloned transaction object
  transaction.socks = socket;

  socket.emit('message', { message: 'welcome!' });

  socket.on("disconnect", (reason) => {
    console.log('client disconnected, reason:', reason);
  });

});

// socket.io routes

// handle abnormal disconnects
io.engine.on("connection_error", (err) => {
  console.log(err.req);	     // the request object
  console.log(err.code);     // the error code, for example 1
  console.log(err.message);  // the error message, for example "Session ID unknown"
  console.log(err.context);  // some additional error context
});

// Serve static files
app.use(express.static('build'));

// App Set //
const PORT = process.env.PORT || 5000;

/** Listen * */
server.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
