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

// these functions are taken from this guide on making a whatsapp clone. 
// found at https://www.youtube.com/watch?v=tBr-PybP_9c
// todo - modify them for our use case

// this triggers on a new client connection
io.on('connection', (socket) => {
  // that id is undefined. The guide had front end logic for identifyind users. 
  // coinbot is not expected to be hosted publicly, so does not differentiate users for logical purposes
  // authentication may be built in later for public cloud hosting, but for now nothing is sent 
  // from the front end so id is undefined
  const id = socket.handshake.query.id;
  socket.join(id);
  console.log('a user connected', id);
  

  // it looks like this takes in recipients who should see the message, and the message itself
  // unsure of where it gets the recipients in the first place, 
  // but we will want to send to anyone connected for now
  socket.on('send-message', ({recipients, text}) =>{
    
    recipients.forEach(recipient => {
      // creates an array for all recipients of messages other than the sender
      // we probably just want the original recipients array because we will 
      // be sending updates from the trade loop
      const newRecipients = recipients.filter(r => r!== recipient);

      // this takes the id from joining. There must be a list somewhere of all connections
      // because it pushes the id for each recipient. Not sure if this is stored in the front end
      // and comes in with the message or on the backend. assuming front end.
      newRecipients.push(id);

      // this is where the server actually makes the broadcast
      // it appears that the .to function specifies who it should be sent to.
      // possibly socket.broadcast.emit('receive-message', /*message details*/) 
      // could be used to send to everyone connected updates about the bot?
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
