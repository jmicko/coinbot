// const { Coinbase } = require("./coinbaseClient");
import { devLog } from "../../src/shared.js";
import { Coinbase } from "./coinbaseClient.js";
// const databaseClient = require("./databaseClient");
import { databaseClient } from "./databaseClient.js";

const botSettings = new class BotSettings {
  constructor() {
    this.loop_speed = Number();
    this.orders_to_sync = Number();
    this.full_sync = Number(1);
    this.maintenance = Boolean(true)
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
    messenger[this.userID].newMessage({ orderUpdate: true })
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
  async update() {
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
    messenger[this.userID]?.userUpdate()
  }
  setSocketStatus(socketStatus) {
    this.socketStatus = socketStatus;
  }
}

class Message {
  constructor(type, text, mCount, cCount, orderUpdate, from) {
    this.type = type;
    this.text = String(text);
    this.mCount = Number(mCount);
    this.cCount = Number(cCount);
    this.timeStamp = new Date();
    this.orderUpdate = Boolean(orderUpdate);
    this.from = from ? String(from) : null;
  }
}

class Messenger {
  constructor(userID) {
    this.userID = userID;
    this.sockets = new Set();
    this.errors = new Array();
    this.messages = new Array();
    this.messageCount = Number(1);
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
      const jsonMsg = JSON. stringify(msg);
      socket.send(jsonMsg);
    })
  }
  newMessage(message) {
    // create the message
    const newMessage = new Message(
      message.type,
      message.text,
      this.messageCount,
      this.chatMessageCount,
      message.orderUpdate,
      message.from
    );
    // add message to messages array if there is text to store
    if (message.text) {
      this.messages.unshift(newMessage);
    }
    // increase the counts
    this.messageCount++;
    if (message.type === 'chat') {
      // only increase chat count if it is a chat type message
      this.chatMessageCount++;
    }


    // check and limit the number of stored messages
    if (this.messages.length > 1000) {
      this.messages.length = 1000;
    }
    // tell user to update messages
    this.sockets.forEach(socket => {
      const jsonMsg = JSON. stringify(message);
      socket.send(jsonMsg);
    })
  }
  getMessages() {
    return this.messages;
  }
  getChatMessages() {
    const chats = [];
    // get the messages
    // const messages = structuredClone(this.messages);
    // extract the chats

    this.messages.forEach(message => {
      if (message.type === 'chat') {
        chats.push(message);
      }
    });
    return chats;
  }
  // pretty much just used for tickers
  instantMessage(message) {
    this.sockets.forEach(socket => {
      const jsonMsg = JSON. stringify(message);
      socket.send(jsonMsg);
    })
  }
  orderUpdate() {
    this.instantMessage({ orderUpdate: true })
  }
  userUpdate() {
    this.instantMessage({ userUpdate: true })
  }
  profitUpdate() {
    this.instantMessage({ profitUpdate: true })
  }
  fileUpdate() {
    this.instantMessage({ fileUpdate: true })
  }
  // todo - should probably use type: 'error' and get rid of this
  newError(err) {
    devLog(err.errorText);
    const error = new Message('error', err.errorText, this.errorCount);
    this.errors.unshift(error);
    this.errorCount++;
    if (this.errors.length > 1000) {
      this.errors.length = 1000;
    }
    this.sockets.forEach(socket => {
      // socket.send('message', error);
      const jsonErr = JSON. stringify(error);
      socket.send(jsonErr);
    })
  }
  getErrors() {
    return this.errors;
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
    this[userID] = new Messenger(userID);
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