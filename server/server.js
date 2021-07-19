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

// const server = http.createServer(app);

// const io = new Server(server);
// const theLoop = require('./modules/theLoop');

// the line below allows us to remove the transports argument on front end in socket const
// todo - but why is it a new server?
// const io = Server(server, {
//   cors: {
//     origin: ["http://localhost:3000"]
//   }
// });

require('dotenv').config();
const bodyParser = require('body-parser');


// Route includes
const tradeRouter = require('./routes/trade.router');


// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


/* Routes */
app.use('/api/trade', tradeRouter);

// socket.io

// this triggers on a new client connection
io.on('connection', (socket) => {

  console.log('a user connected', socket.id);

  // testing send message to client
  let data = { message: 'hello there' }
  let data2 = { message: 'hello again' }
  let data3 = { message: 'goodbye' }
  // this sends a message to the client
  // socket.send(data);
  // this is the same as above but it sends it twice?
  // Yeah, if both are not commented out, it sends twice
  // ohhhhhh it's because it emits for each client?
  socket.emit('message', data2);
  // brodcast sends to all but original client
  socket.broadcast.emit('message', data3);




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
