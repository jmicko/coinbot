const io = require("socket.io-client");
const ENDPOINT = "http://localhost:5000";
const socket = io(ENDPOINT);

const sendMessage = (message) => {
    socket.emit('message', { message: message });
}

const sendCheckerUpdate = (update) => {
    socket.emit('checkerUpdate', { message: update });
}

const socketClient = {
    sendMessage: sendMessage,
    sendCheckerUpdate: sendCheckerUpdate
}

module.exports = socketClient;