const { Coinbase } = require("./coinbaseClient");
const databaseClient = require("./databaseClient");

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
    // console.log(botSettings, 'refreshing bot settings');
  }
  change(settings) {
    Object.assign(this, settings)
    // console.log(this);
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
    this.available_btc = user.available_btc;
    this.available_usd = user.available_usd;
    this.actualavailable_btc = user.actualavailable_btc;
    this.actualavailable_usd = user.actualavailable_usd;
    this.max_trade = user.max_trade;
    this.max_trade_size = user.max_trade_size;
    this.max_trade_load = user.max_trade_load;
    this.profit_accuracy = user.profit_accuracy;
    this.auto_setup_number = user.auto_setup_number;
    this.profit_reset = user.profit_reset;
    // I think you can just preload an array like this?
    this.botStatus = new Array(['setup']);
    this.willCancel = new Set();
    this.ordersToCheck = new Array();
    this.loopNumber = Number(0);
    this.deleting = false;
    this.socketStatus = 'closed';
  }
  getUser() {
    // console.log('getting the user')
    return structuredClone(this);
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
    messenger[this.userID].userUpdate()
  }
  activate(bool) {
    this.active = bool;
    messenger[this.userID].userUpdate()
  }
  async update() {
    const user = await databaseClient.getUserAndSettings(this.userID);
    console.log(this.userID, user, 'the user in update()');
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
    this.available_btc = user.available_btc;
    this.available_usd = user.available_usd;
    this.actualavailable_btc = user.actualavailable_btc;
    this.actualavailable_usd = user.actualavailable_usd;
    this.max_trade = user.max_trade;
    this.max_trade_size = user.max_trade_size;
    this.max_trade_load = user.max_trade_load;
    this.profit_accuracy = user.profit_accuracy;
    this.auto_setup_number = user.auto_setup_number;
    this.profit_reset = user.profit_reset;
  }
  setSocketStatus(socketStatus){
    this.socketStatus = socketStatus;
  }
}

class Message {
  constructor(type, text, mCount, cCount, orderUpdate) {
    this.type = type;
    this.text = String(text);
    this.mCount = Number(mCount);
    this.cCount = Number(cCount);
    this.timeStamp = new Date();
    this.orderUpdate = Boolean(orderUpdate);
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
      console.log(`client with id: ${socket.id} disconnected, reason:`, reason);
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
      socket.emit('message', msg);
    })
  }
  newMessage(message) {
    // create the message
    const newMessage = new Message(message.type, message.text, this.messageCount, this.chatMessageCount, message.orderUpdate);
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
      socket.emit('message', message);
    })
  }
  // pretty much just used for tickers
  instantMessage(message) {
    this.sockets.forEach(socket => {
      socket.emit('message', message);
    })
  }
  orderUpdate() {
    this.instantMessage({ orderUpdate: true })
  }
  userUpdate() {
    this.instantMessage({ userUpdate: true })
  }
  // todo - should probably use type: 'error' and get rid of this
  newError(err) {
    console.log(err.errorText);
    const error = new Message('error', err.errorText, this.errorCount);
    this.errors.unshift(error);
    this.errorCount++;
    if (this.errors.length > 1000) {
      this.errors.length = 1000;
    }
    this.sockets.forEach(socket => {
      socket.emit('message', error);
    })
  }
}

// store an object with each user api. keep it separate from user storage to prevent accident
const apiStorage = new class {

};
// store a client to connect to coinbase
const cbClients = new class {
  constructor() { }

  async updateAPI(userID) {
    const userAPI = await databaseClient.getUserAPI(userID);

    Object.assign(apiStorage[userID], userAPI)

    // console.log(this, userAPI, 'the new cbClient');
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
    // console.log(userAndSettings,'user and settings when creating new user');
    this.idList.push(userID);
    // create user object at index of user id for user storage
    // need to create user first because other things depend on it
    this[userID] = new User(userAndSettings)
    // create an object to store messages and errors and sockets to send them with
    messenger.newMessenger(userID);
    try {
      const userAPI = await databaseClient.getUserAPI(userID);
      // create api object at index of user id
      apiStorage[userID] = Object();
      // add the user api to the apiStorage array
      cache.storeAPI(userID, userAPI);

      // the user will only be active if they have an api
      // if (!user.active) {
      //   console.log(user, '<- the user in userStorage');
      //   // do not start the Coinbase client if they are not active
      //   return
      // }
      // store a coinbase client for the user
      await cbClients.updateAPI(userID)
      // cbClients[userID] = new Coinbase(userAPI.CB_ACCESS_KEY, userAPI.CB_SECRET, ['BTC-USD', 'ETH-USD']);

    } catch (err) {
      console.log(err, `\nERROR creating new user`);
    }
  }
  // get a deep copy of a user's object
  getUser(userID) {
    if (this[userID]) {
      return structuredClone(this[userID])
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
    console.log(this.idList.indexOf(Number(userID)), userID, 'index to delete');
    this.idList.splice(this.idList.indexOf(Number(userID)), 1);
    this[userID].deleting = true;
    // send an orderUpdate which will log out the user
    messenger[userID].orderUpdate();
  }

};


// 
// 
// 
// 
// 
// 
// 
// 
// 
// 
// 
// 


const cache = {

  getBotSettings: () => {
    // if (botSettings) {
    return structuredClone(botSettings)
    // }
  },

  // set up a storage cache for a new user
  createNewUser: async (user) => {




    // get the user id
    const userID = user.id;
    // create user object at index of user id for user storage
    // need to create user first because other things depend on it
    userStorage[userID] = new User(user)
    // console.log(userStorage[userID], 'after storing user in storage');
    // create an object to store messages and errors and sockets to send them with
    messenger[userID] = new Messenger(userID);
    // create object for api at index of user id
    // apiStorage[userID] = new Api(userID);
    // console.log(messenger, userID, 'new socket storage');

    // cache the API from the db
    try {

      const userAPI = await databaseClient.getUserAPI(userID);
      // create api object at index of user id
      apiStorage[userID] = Object();
      // add the user api to the apiStorage array
      cache.storeAPI(userID, userAPI);

      // the user will only be active if they have an api
      if (!user.active) {
        console.log(user, '<- the user in cache.createNewUser');
        // do not start the Coinbase client if they are not active
        return
      }
      // store a coinbase client for the user
      cbClients[userID] = new Coinbase(userAPI.CB_ACCESS_KEY, userAPI.CB_SECRET, ['BTC-USD', 'ETH-USD']);

    } catch (err) {
      console.log(err, `\nERROR creating new user`);
    }
  },

  // USER SETTINGS STORAGE
  refreshUser: async (userID) => {
    await userStorage[userID].update();
  },

  // KEEP TRACK OF ORDERS TO CANCEL
  setCancel: (userID, orderID) => {
    const userStore = userStorage[userID]
    // add the id to the willCancel set
    userStore.willCancel.add(orderID);
    // delete the id from the set after 30 seconds. Bot would have seen it by then
    setTimeout(() => {
      userStore.willCancel.delete(orderID)
    }, 30 * 1000);

  },

  checkIfCanceling: (userID, orderID) => {
    const userStore = userStorage[userID]
    // find if id is in the willCancel set
    return userStore.willCancel.has(orderID)
  },

  getUser: (userID) => {
    // make a deep copy so you don't delete the api from the user
    // !userStorage[userID] && console.log(userStorage[userID], 'getting user from storage!!');
    const user = structuredClone(userStorage[userID])
    // console.log(user, 'GETTTINGH USER FROM STORAGE');
    // console.log(user, userStorage[userID], 'user from get user function');
    // delete user.api
    return user
  },

  getAllUsers: () => {
    let allUsers = []
    userStorage.forEach(user => {
      if (user && user.id !== 0) {
        // get a deep copy of the user
        const userCopy = cache.getUser(user.id)
        // push the user copy into the array
        allUsers.push(userCopy);
      }
    })
    return allUsers;
  },

  // LOOP STATUS UPDATES
  updateStatus: (userID, update) => {
    userStorage[userID].botStatus.unshift(update);
    if (userStorage[userID].botStatus.length > 100) {
      userStorage[userID].botStatus.length = 100;
    }
  },
  getStatus: (userID) => {
    return structuredClone(userStorage[userID].botStatus);
  },
  clearStatus: (userID) => {
    userStorage[userID].botStatus.length = 0;
  },

  // ERROR STORAGE - store 1000 most recent errors
  storeError: (userID, error) => {
    const errorData = {
      // error text is to store a custom error message to show the user
      errorText: error.errorText,
      // error data is intended to store actual chunks of data from the error response.
      // keep in mind that the response includes headers that hold the API details, 
      // so don't store the whole thing because it gets sent outside the server
      errorData: error.errorData,
      // automatically store the timestamp
      timeStamp: new Date(),
      count: messenger[userID].errorCount
    }
    messenger[userID].errorCount++;

    messenger[userID].errors.unshift(errorData);
    if (messenger[userID].errors.length > 1000) {
      messenger[userID].errors.length = 1000;
    }
    // console.log(messenger);
    // tell Dom to update errors
    messenger[userID].sockets.forEach(socket => {
      // find all open sockets for the user
      if (socket.userID === userID) {
        // console.log(socket.userID, userID)
        const msg = {
          type: 'errorUpdate',
        }
        socket.emit('message', msg);
      }
    })
  },
  getErrors: (userID) => {
    return messenger[userID].errors;
  },
  clearErrors: (userID) => {
    messenger[userID].errors.length = 0;
  },

  // MESSAGE STORAGE - store 1000 most recent messages
  storeMessage: (userID, message) => {
    // todo - chats are also being sent here so need to change this to differentiate type
    messenger[userID].newMessage(message);

  },


  getMessages: (userID) => {
    // console.log(messenger[userID], 'user messenger');
    return messenger[userID].messages;
  },

  getChatMessages: (userID) => {
    const chats = [];
    // get the messages
    const messages = structuredClone(messenger[userID].messages);
    // extract the chats

    // console.log(messages, '<-- what is this');
    messages.forEach(message => {
      if (message.type === 'chat') {
        chats.push(message);
      }
    });
    return chats;
  },

  clearMessages: (userID) => {
    messenger[userID].length = 0;
  },

  // LOOP COUNTER
  increaseLoopNumber: (userID) => {
    // throwing an error here on 1st user creation
    userStorage[userID].loopNumber++;
  },

  getLoopNumber: (userID) => {
    return userStorage[userID].loopNumber;
  },

  // API STORAGE
  storeAPI: (userID, api) => {
    Object.assign(apiStorage[userID], api)
    // console.log(apiStorage[userID], 'SAVING NEW API TO STORAGE______________');
  },

  getAPI: (userID) => {
    return structuredClone(apiStorage[userID]);
  },

  // get all cache storage for a user but remove API before returning
  getSafeStorage: (userID) => {
    // create a deep copy of the user's storage object so that it can be changed
    // console.log('getting safe storage');
    const safeStorage = userStorage[userID]
      ? structuredClone(userStorage[userID])
      : { user: null, api: null };
    return safeStorage;
  },

  heartbeat: (userID, message) => {
    messenger[userID].heartbeat(userID, side)
  }
}

module.exports = { cache, messenger, botSettings, userStorage, cbClients };