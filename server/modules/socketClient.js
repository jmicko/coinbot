// I am very unclear about what is happening here lmao
// I don't know if I should be making a new instance of io 
// or if I can keep using the same one since it's the client version.
// was getting multiple console logs for each message on the dom, 
// but those that are still there seem to be more from the useState hook than the server.
// For now, this works. Need to clean it up later

// this may be a problem on the front end. May duplicate itself as react reloads things


const io = require("socket.io-client");
const ENDPOINT = "http://localhost:5000";
const socketClient = io(ENDPOINT);
// const socketClient = new io(ENDPOINT);


// class socketClient {

//     sendMessage = (message) => {
//         socket.emit('message', { message: message });
//     }

//     sendCheckerUpdate = (update) => {
//         // socket.emit('exchangeUpdate', { message: update });
//     }

// }

module.exports = socketClient;


// =========================================


// const io = require("socket.io-client");
// const ENDPOINT = "http://localhost:5000";
// const socket = io(ENDPOINT);

// const sendMessage = (message) => {
//     socket.emit('message', { message: message });
// }

// const sendCheckerUpdate = (update) => {
//     socket.emit('exchangeUpdate', { message: update });
// }

// const socketClient = {
//     sendMessage: sendMessage,
//     sendCheckerUpdate: sendCheckerUpdate
// }

// module.exports = socketClient;