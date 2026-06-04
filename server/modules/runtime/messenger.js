import { devLog } from '../utilities.js';
import { getAllErrorMessages, getBotMessages, getChatMessages, saveMessage } from '../database/messages.js';
import { botSettings } from './botSettings.js';
import { userStorage } from './userStorage.js';

class Message {
  constructor({ type, text, orderUpdate, from, to, data }) {
    this.type = type;
    this.text = String(text);
    this.timestamp = new Date();
    this.orderUpdate = Boolean(orderUpdate);
    this.from = from ? String(from) : null;
    this.to = to ? String(to) : 'all';
    this.data = data ? data : null;
  }
}

class Messenger {
  constructor(userID) {
    this.userID = userID;
    this.sockets = new Set();
    this.errors = new Array();
    this.messages = new Array();
    this.messageCount = Number(1);
    this.chatMessages = new Array();
    this.chatMessageCount = Number(1);
    this.errorCount = Number(1);
  }

  addSocket(socket) {
    socket.on("disconnect", (reason) => {
      devLog(`client with id: ${socket.id} disconnected, reason:`, reason);
      this.deleteSocket(socket);
    });
    this.sockets.add(socket);
  }

  deleteSocket(socket) {
    this.sockets.delete(socket);
  }

  heartBeat(side) {
    this.sockets.forEach(socket => {
      const loopNumber = userStorage.getLoopNumber(this.userID);
      const fullSync = botSettings.full_sync || 1;
      const msg = {
        type: 'heartbeat',
        side: side,
        count: loopNumber > 0 ? ((loopNumber - 1) % fullSync) : 0
      };
      socket.send(JSON.stringify(msg));
    });
  }

  async saturateMessages() {
    const botMessages = await getBotMessages(this.userID);
    const chatMessages = await getChatMessages(this.userID);

    this.messages.length = 0;
    this.messages.push(...botMessages);
    this.chatMessages.length = 0;
    this.chatMessages.push(...chatMessages);
    this.messageCount = this.messages.length;
    this.chatMessageCount = this.getChatMessages().length;

    const errors = await getAllErrorMessages(this.userID);
    this.errors.length = 0;
    this.errors.push(...errors);
    this.errorCount = this.errors.length;
  }

  async newMessage(message) {
    let fullMessage;
    const newMessage = new Message({ ...message });

    if (message.text) {
      const saved = await saveMessage(this.userID, newMessage);
      if (message.type === 'chat') {
        this.chatMessages.unshift(saved);
        this.chatMessageCount++;
        if (this.chatMessages.length > 1000) {
          this.chatMessages.length = 1000;
        }
      } else {
        this.messages.unshift(saved);
        this.messageCount++;
        if (this.messages.length > 1000) {
          this.messages.length = 1000;
        }
      }
      fullMessage = saved;
    }

    const jsonMsg = JSON.stringify(message);
    console.log(jsonMsg, 'jsonMsg');
    this.sockets.forEach(socket => {
      socket.send(jsonMsg);
    });
    return fullMessage;
  }

  newChatFromOther(message) {
    if (message.text) {
      this.chatMessages.unshift(message);
    }
    this.chatMessageCount++;
    if (this.chatMessages.length > 1000) {
      this.chatMessages.length = 1000;
    }
    const jsonMsg = JSON.stringify(message);
    this.sockets.forEach(socket => {
      socket.send(jsonMsg);
    });
  }

  getMessages() {
    const messages = [];

    this.messages.forEach(message => {
      if (message.type !== 'chat' && message.type !== 'error') {
        messages.push(message);
      }
    });
    return messages;
  }

  getChatMessages() {
    const chats = [];

    this.chatMessages.forEach(message => {
      if (message.type === 'chat') {
        chats.push(message);
      }
    });
    return chats;
  }

  instantMessage(message) {
    this.sockets.forEach(socket => {
      const jsonMsg = JSON.stringify(message);
      socket.send(jsonMsg);
    });
  }

  orderUpdate() {
    this.instantMessage({ type: 'orderUpdate', orderUpdate: true });
  }

  userUpdate(identifier) {
    this.instantMessage({ type: 'userUpdate', userUpdate: true, identifier: identifier });
  }

  profitUpdate() {
    this.instantMessage({ profitUpdate: true });
  }

  fileUpdate() {
    this.instantMessage({ fileUpdate: true });
  }

  messageUpdate() {
    this.instantMessage({ type: 'messageUpdate', messageUpdate: true });
  }

  async newError(err) {
    try {
      devLog(err.errorText);
      const error = new Message({
        type: 'error',
        text: err.errorText,
        data: err.data ? err.data : null
      });
      if (error.text) {
        const saved = await saveMessage(this.userID, error);
        this.errors.unshift(saved);
      }

      this.errorCount++;
      if (this.errors.length > 1000) {
        this.errors.length = 1000;
      }
      this.sockets.forEach(socket => {
        const jsonErr = JSON.stringify(error);
        socket.send(jsonErr);
      });
    } catch (err) {
      console.log(err, 'error in newError. Probably cannot save error');
    }
  }

  getErrors() {
    return this.errors;
  }

  clearErrors() {
    this.errors.length = 0;
  }
}

const messenger = new class {
  newMessenger(userID) {
    this[userID] = new Messenger(userID);
    this[userID].saturateMessages().catch(err => {
      devLog(err, 'error saturating runtime messages');
    });
  }
};

export { messenger };
