const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

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
io.on('connection', (socket) => {
  const id = socket.handshake.query.id;
  socket.join(id);

  console.log('a user connected');

  socket.on('send-message', ({recipients, text}) =>{
    recipients.forEach(recipient => {
      const newRecipients = recipients.filter(r => r!== recipient)
      newRecipients.push(id);
      socket.broadcast.to(recipient).emit('receive-message', {
        recipients: newRecipients,
        sender: id,
        text
      })
    });
  })
});

// Serve static files
app.use(express.static('build'));

// App Set //
const PORT = process.env.PORT || 5000;

/** Listen * */
server.listen(PORT, () => {
  console.log(`Listening on port: ${PORT}`);
});
