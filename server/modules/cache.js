import { devLog } from "./utilities.js";
import { Coinbase } from "./coinbaseClient.js";
import { getAllErrorMessages, getAllMessages, getBotMessages, getChatMessages, saveMessage } from "./database/messages.js";
import { databaseClient } from "./databaseClient.js";

const botSettings = new class BotSettings {
  constructor() {
    this.loop_speed = Number();
    this.orders_to_sync = Number();
    this.full_sync = Number(1);
    this.maintenance = Boolean(true);
    this.registration_open = Boolean(true);
  }
  async refresh() {
    const newBotSettings = await databaseClient.getBotSettings();
    // save settings to the cache
    Object.assign(this, newBotSettings)
  }
  change(settings) {
    Object.assign(this, settings)
  }
  get() {
    return structuredClone(this);
  }
}


// I'm pretty new to classes so this might be a bit jumbled for now. Not sure what I'm doing lol
// seems like the constructor inputs should be things that will stay with the new object forever
// the different methods can then be called on whatever properties get stored there
class User {
  constructor(user) {
    this.userID = user.id;
    this.username = user.username;
    this.admin = user.admin;
    this.active = user.active;
    this.approved = user.approved;
    this.paused = user.paused;
    this.joined_at = user.joined_at;
    this.kill_locked = user.kill_locked;
    this.theme = user.theme;
    this.reinvest = user.reinvest;
    this.reinvest_ratio = user.reinvest_ratio;
    this.post_max_reinvest_ratio = user.post_max_reinvest_ratio;
    this.reserve = user.reserve;
    this.maker_fee = user.maker_fee;
    this.taker_fee = user.taker_fee;
    this.usd_volume = user.usd_volume;
    this.availableFunds = new Object();
    this.max_trade = user.max_trade;
    this.max_trade_size = user.max_trade_size;
    this.max_trade_load = user.max_trade_load;
    this.sync_quantity = user.sync_quantity;
    this.profit_accuracy = user.profit_accuracy;
    this.auto_setup_number = user.auto_setup_number;
    this.profit_reset = user.profit_reset;
    this.can_chat = user.can_chat;
    // I think you can just preload an array like this?
    this.botStatus = new Array(['setup']);
    this.willCancel = new Set();
    this.ordersToCheck = new Array();
    this.loopNumber = Number(0);
    this.deleting = false;
    this.socketStatus = 'closed';
    this.candlesBeingUpdated = new Object();
    this.exporting = false;
    this.simulating = false;
    this.simulationResults = null;
    this.timeouts = new Array();
  }
  getTimeoutForSub(sub) {
    // console.log(this.timeouts, 'TIMEOUTS', sub, 'SUB')
    // return this.timeouts.find(timeout => timeout.subscription.endpoint === sub.endpoint);
    // just like above, but return all timeouts for a given subscription
    return this.timeouts.filter(timeout => timeout.subscription.endpoint === sub.endpoint);
  }
  updateCandlesBeingUpdated(product_id, granularity, boolean) {
    if (!this.candlesBeingUpdated[product_id]) {
      this.candlesBeingUpdated[product_id] = {};
    }
    this.candlesBeingUpdated[product_id][granularity] = boolean;
  }
  getUser() {
    // return structuredClone(this);
    // return a structured clone of the user object except for the timeouts array, which can't be cloned
    const user = Object.assign({}, this);
    delete user.timeouts;
    return structuredClone(user);
  }
  // update available funds
  updateAvailableFunds(funds) {
    this.availableFunds = funds;
  }
  // get available funds
  getAvailableFunds() {
    return structuredClone(this.availableFunds);
  }
  addToCheck(orders) {
    this.ordersToCheck = orders;
  }
  getToCheck(orders) {
    return structuredClone(this.ordersToCheck);
  }
  clearToCheck(orders) {
    this.ordersToCheck = new Array();
  }
  setCancel(order_id) {
    this.willCancel.add(order_id);
  }
  checkCancel(order_id) {
    return this.willCancel.has(order_id)
  }
  orderUpdate() {
    messenger[this.userID].newMessage({ type: 'orderUpdate', orderUpdate: true })
  }
  messageUpdate() {
    messenger[this.userID].newMessage({ type: 'messageUpdate', messageUpdate: true })
  }
  // increase the loop number by 1
  increaseLoopNumber() {
    this.loopNumber++;
  }
  getLoopNumber() {
    return structuredClone(this.loopNumber);
  }
  updateStatus(update) {
    this.botStatus.unshift(update);
    if (this.botStatus.length > 100) {
      this.botStatus.length = 100;
    }
  }
  clearStatus() {
    this.botStatus.length = 0;
  }
  approve(bool) {
    this.approved = bool;
    messenger[this.userID]?.userUpdate()
  }
  activate(bool) {
    this.active = bool;
    messenger[this.userID]?.userUpdate()
  }
  async update(identifier) {
    const user = await databaseClient.getUserAndSettings(this.userID);
    this.userID = user.id;
    this.username = user.username;
    this.admin = user.admin;
    this.active = user.active;
    this.approved = user.approved;
    this.paused = user.paused;
    this.joined_at = user.joined_at;
    this.kill_locked = user.kill_locked;
    this.theme = user.theme;
    this.reinvest = user.reinvest;
    this.reinvest_ratio = user.reinvest_ratio;
    this.post_max_reinvest_ratio = user.post_max_reinvest_ratio;
    this.reserve = user.reserve;
    this.maker_fee = user.maker_fee;
    this.taker_fee = user.taker_fee;
    this.usd_volume = user.usd_volume;
    this.max_trade = user.max_trade;
    this.max_trade_size = user.max_trade_size;
    this.max_trade_load = user.max_trade_load;
    this.sync_quantity = user.sync_quantity;
    this.profit_accuracy = user.profit_accuracy;
    this.auto_setup_number = user.auto_setup_number;
    this.profit_reset = user.profit_reset;
    this.can_chat = user.can_chat;
    messenger[this.userID]?.userUpdate(identifier);
  }
  setSocketStatus(socketStatus) {
    this.socketStatus = socketStatus;
  }
}

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
    // handle disconnection when socket closes
    socket.on("disconnect", (reason) => {
      const userID = socket.request.session.passport?.user;
      devLog(`client with id: ${socket.id} disconnected, reason:`, reason);
      this.deleteSocket(socket);
    });
    this.sockets.add(socket)
  }
  deleteSocket(socket) {
    this.sockets.delete(socket)
  }
  // this method is really terrible but for now I need it to keep old code working hahaha I don't have time
  heartBeat(side) {
    // send a heartbeat to all open sockets for the user
    this.sockets.forEach(socket => {
      const msg = {
        type: 'heartbeat',
        side: side,
        // count: 5
        count: ((userStorage[this.userID].loopNumber - 1) % botSettings.full_sync)
      }
      const jsonMsg = JSON.stringify(msg);
      socket.send(jsonMsg);
    })
  }


  // saturate the user's messages with messages from the database
  async saturateMessages() {
    // get the messages from the database
    const messages = await getAllMessages(this.userID);
    const botMessages = await getBotMessages(this.userID);
    const chatMessages = await getChatMessages(this.userID);
    // console.log(messages, 'all messages from database', this.userID);
    // console.log(messages, 'all messages from database', this.userID);
    // clear the messages array and add the messages from the database
    this.messages.length = 0;
    this.messages.push(...botMessages);
    this.chatMessages.length = 0;
    this.chatMessages.push(...chatMessages);
    // set the message count to the length of the messages array
    this.messageCount = this.messages.length;
    // set the chat message count to the length of the chat messages array
    this.chatMessageCount = this.getChatMessages().length;

    // get the errors from the database
    const errors = await getAllErrorMessages(this.userID);
    // clear the errors array and add the errors from the database
    this.errors.length = 0;
    this.errors.push(...errors);
    // set the error count to the length of the errors array
    this.errorCount = this.errors.length;
  }

  async newMessage(message) {
    let fullMessage;
    // create the message
    const newMessage = new Message(
      // message.type,
      // message.text,
      // message.orderUpdate,
      // message.from
      { ...message }
    );
    // add message to messages array if there is text to store
    if (message.text) {
      const saved = await saveMessage(this.userID, newMessage);
      // console.log(saved, 'saved and returned from saveMessage');
      if (message.type === 'chat') {
        this.chatMessages.unshift(saved);
        this.chatMessageCount++;
        // check and limit the number of stored messages
        if (this.chatMessages.length > 1000) {
          this.chatMessages.length = 1000;
        }
      } else {
        this.messages.unshift(saved);
        this.messageCount++;
        // check and limit the number of stored messages
        if (this.messages.length > 1000) {
          this.messages.length = 1000;
        }
      }
      fullMessage = saved;
      // save the message to the database
    }
    // tell user to update messages
    const jsonMsg = JSON.stringify(message);
    console.log(jsonMsg, 'jsonMsg');
    this.sockets.forEach(socket => {
      socket.send(jsonMsg);
    })
    return fullMessage;
  }
  newChatFromOther(message) {
    // message will already be formatted as a message object
    // add message to messages array if there is text to store
    if (message.text) {
      this.chatMessages.unshift(message);
      // message is already in the database
    }
    // increase the counts
    this.chatMessageCount++;
    // check and limit the number of stored messages
    if (this.chatMessages.length > 1000) {
      this.chatMessages.length = 1000;
    }
    // tell user to update messages
    const jsonMsg = JSON.stringify(message);
    this.sockets.forEach(socket => {
      socket.send(jsonMsg);
    })
  }
  getMessages() {
    const messages = [];

    this.messages.forEach(message => {
      // console.log(message, 'message');
      if (message.type !== 'chat' && message.type !== 'error') {
        messages.push(message);
      }
    });
    return messages;
  }
  getChatMessages() {
    const chats = [];
    // get the messages
    // const messages = structuredClone(this.messages);
    // extract the chats

    this.chatMessages.forEach(message => {
      // console.log(message, 'message');
      if (message.type === 'chat') {
        chats.push(message);
      }
    });
    return chats;
  }
  // pretty much just used for tickers
  instantMessage(message) {
    this.sockets.forEach(socket => {
      const jsonMsg = JSON.stringify(message);
      socket.send(jsonMsg);
    })
  }
  orderUpdate() {
    this.instantMessage({ type: 'orderUpdate', orderUpdate: true })
  }
  userUpdate(identifier) {
    this.instantMessage({ type: 'userUpdate', userUpdate: true, identifier: identifier })
  }
  profitUpdate() {
    this.instantMessage({ profitUpdate: true })
  }
  fileUpdate() {
    this.instantMessage({ fileUpdate: true })
  }
  messageUpdate() {
    this.instantMessage({ type: 'messageUpdate', messageUpdate: true })
  }
  // todo - should probably use type: 'error' and get rid of this
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
        // socket.send('message', error);
        const jsonErr = JSON.stringify(error);
        socket.send(jsonErr);
      })
    } catch (err) {
      console.log(err, 'error in newError. Probably cannot save error');
    }
  }
  getErrors() {
    return this.errors;
    // const errors = [];

    // this.messages.forEach(message => {
    //   // console.log(message, 'message');
    //   if (message.type === 'error') {
    //     errors.push(message);
    //   }
    // });
    // return errors;
  }
  clearErrors() {
    this.errors.length = 0;
  }
}

// store an object with each user api. keep it separate from user storage to prevent accident
// const apiStorage = new class {

// };
// store a client to connect to coinbase
const cbClients = new class {
  constructor() {
    this.apiStorage = new Object();
  }

  async updateAPI(userID) {
    devLog('updating api for user: ' + userID)
    const userAPI = await databaseClient.getUserAPI(userID);

    // Object.assign(apiStorage[userID], userAPI)


    this.apiStorage[userID] = Object();
    Object.assign(this.apiStorage[userID], userAPI)

    if (userAPI.CB_ACCESS_KEY?.length) {
      this[userID] = new Coinbase(userAPI.CB_ACCESS_KEY, userAPI.CB_SECRET, ['BTC-USD', 'ETH-USD']);
      userStorage[userID].activate(true);
    } else {
      userStorage[userID].activate(false);
    }
    messenger[userID].userUpdate();
  }
};
// store an object with arrays for messages and errors
const messenger = new class {
  constructor() { }
  newMessenger(userID) {
    // good lorde there is so much abstraction going on here
    this[userID] = new Messenger(userID);
    // saturate the messages with messages from the database
    this[userID].saturateMessages();
  }
};


// the storage arrays will store objects/arrays/sets of different things at the index of the user id
// they are not exported so they can be safely manipulated only by functions in this file
// store an object per user with the user settings and some key/value properties
const userStorage = new class {
  constructor() {
    this.idList = new Array();
  }
  async createNewUser(user) {
    // get the user id
    const userID = user.id;
    const userAndSettings = await databaseClient.getUserAndSettings(userID)
    this.idList.push(userID);
    // create user object at index of user id for user storage
    // need to create user first because other things depend on it
    this[userID] = new User(userAndSettings)
    // create an object to store messages and errors and sockets to send them with
    messenger.newMessenger(userID);
    try {
      // const userAPI = await databaseClient.getUserAPI(userID);
      // create api object at index of user id
      // apiStorage[userID] = Object();
      // add the user api to the apiStorage array
      // cache.storeAPI(userID, userAPI);
      // Object.assign(apiStorage[userID], userAPI)
      // the user will only be active if they have an api
      // if (!user.active) {
      //   devLog(user, '<- the user in userStorage');
      //   // do not start the Coinbase client if they are not active
      //   return
      // }
      // store a coinbase client for the user
      await cbClients.updateAPI(userID)
      // cbClients[userID] = new Coinbase(userAPI.CB_ACCESS_KEY, userAPI.CB_SECRET, ['BTC-USD', 'ETH-USD']);

    } catch (err) {
      devLog(err, `\nERROR creating new user`);
    }
  }
  // get a deep copy of a user's object
  getUser(userID) {
    if (this[userID]) {
      return this[userID].getUser();
    }
    // else {
    //   return { deleting: true }
    // }
  }
  getAllUsers() {
    return structuredClone(this.idList);
  }
  // delete the user if there is one
  deleteUser(userID) {
    try {
      devLog(this.idList.indexOf(Number(userID)), userID, '<-index to delete', this.idList);
      this.idList.splice(this.idList.indexOf(Number(userID)), 1);
      this[userID].deleting = true;
      // send an orderUpdate which will log out the user
      messenger[userID].orderUpdate();
    } catch (err) {
      devLog(err, 'error deleting user');
    }
  }

};


export { messenger, botSettings, userStorage, cbClients };