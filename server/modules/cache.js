const databaseClient = require("./databaseClient");

// store the bot settings
const botSettings = {};
// new Object({
//   loop_speed: Number(),
//   orders_to_sync: Number(),
//   full_sync: Number(1),
//   maintenance: Boolean()
// });

// the storage arrays will store objects/arrays/sets of different things at the index of the user id
// they are not exported so they can be safely manipulated only by functions in this file
// store an object per user with the user settings and some key/value properties
const userStorage = [];
// store an object with each user api. keep it separate from user storage to prevent accident
const apiStorage = [];
// store an object with arrays for messages and errors
const messageStorage = [];
// store a set of connected sockets for each user
const socketStorage = [];

// I'm pretty new to classes so this might be a bit jumbled for now. Not sure what I'm doing lol
// seems like the constructor inputs should be things that will stay with the new object forever

class SocketSet {
  constructor() {
    this.sockets = new Set();
  }
  addSocket(socket) {
    this.sockets.add(socket)
  }
  deleteSocket(socket) {
    this.sockets.delete(socket)
  }
  // this method is really terrible but for now I need it to keep old code working hahaha I don't have time
  messageToUser(message) {
    this.sockets.forEach(socket => {
      // find all open sockets for the user
      console.log(socket.userID, 'equal?', socket.request.session.passport?.user)
      const msg = {
        type: 'messageUpdate',
        orderUpdate: message.orderUpdate,
      }
      socket.emit('message', msg);
    })
  }
  heartbeat(userID, side) {
    // take out the userID thing once we have a better way to get the loop number
    // const loopNumber = cache.getLoopNumber(userID);
    // const botSettings = botSettings;

    this.sockets.forEach(socket => {
      const msg = {
        type: 'heartbeat',
        side: side,
        count: 5
        // count: ((loopNumber - 1) % botSettings.full_sync)
      }
      socket.emit('message', msg);
    })
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

// store messages/errors, and make new ones
class Messages {
  constructor(userID) {
    this.userID = userID;
    this.errors = new Array();
    this.messages = new Array();
    this.messageCount = Number(1);
    this.chatMessageCount = Number(1);
    this.errorCount = Number(1);
  }
  newMessage(message) {
    // create the message
    const newMessage = new Message(message.type, message.text, this.messageCount, this.chatMessageCount, message.orderUpdate);
    // add message to messages array
    this.messages.unshift(newMessage);
    // icrease the counts
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
    socketStorage[this.userID].messageToUser(message)
  }
  // todo - should probably use type: 'error and get rid of this
  newError(type, text) {
    const error = new Message(type, text, this.count);
    this.errors.unshift(error);
    this.errorCount++;
    if (this.errors.length > 1000) {
      this.errors.length = 1000;
    }
  }
}



const cache = {
  refreshBotSettings: async () => {
    const newBotSettings = await databaseClient.getBotSettings();
    // save settings to the cache
    cache.setBotSettings(newBotSettings);
    console.log(botSettings, 'refreshing bot settings');
  },
  setBotSettings: (newSettings) => {
    Object.assign(botSettings, newSettings)
  },
  getBotSettings: () => {
    // if (botSettings) {
    return structuredClone(botSettings)
    // }
  },

  // set up a storage cache for a new user
  createNewUser: async (user) => {
    // get the user id
    const userID = user.id;
    // delete password. we don't need it here
    delete user.password
    // insert the user at the array index matching their id
    const storage = {
      ...user,
      botStatus: ['setup'],
      // errors: Array(),
      // messages: Array(),
      // chatMessages: Array(),
      // hold orders that will be canceled so bot can check against them before reordering
      willCancel: new Set(),
      keyValuePairs: Object(),
      loopNumber: Number(),
      // api: null,
      // can't use .length to get counts or they end up at 1000. need a counter instead
      // messageCount: 1,
      // chatMessageCount: 1,
      // errorCount: 1
    };

    // create user object at index of user id for user storage
    userStorage[userID] = Object();
    // add the user info to the userStorage array
    Object.assign(userStorage[userID], storage)
    console.log(userStorage[userID], 'after storing user in storage');
    // create an object to store messages and errors
    messageStorage[userID] = new Messages(userID);

    // create user object for sockets
    // const newSocketStorage = new SocketSet();
    // add the user info to the messageStorage array
    socketStorage[userID] = new SocketSet();
    console.log(socketStorage, userID, 'new socket storage');

    // cache the API from the db
    try {
      const userAPI = await databaseClient.getUserAPI(userID);
      // create api object at index of user id
      apiStorage[userID] = Object();
      // add the user api to the apiStorage array
      cache.storeAPI(userID, userAPI);
      console.log(userAPI, apiStorage[userID], 'SAVING NEW API TO STORAGE______________1');
    } catch (err) {
      console.log(err, 'error creating new user');
    }
  },

  // USER SETTINGS STORAGE
  refreshUser: async (userID) => {
    // don't refresh the robot user
    if (userID === 0) {
      return
    }
    user = await databaseClient.getUserAndSettings(userID);
    // don't need password
    delete user.password
    // if there is a user, set the user as the user. lmao. Otherwise empty object
    userStorage[userID] = (user) ? { ...userStorage[userID], ...user } : null;
    // get and store the api from the db
    const userAPI = await databaseClient.getUserAPI(userID);
    cache.storeAPI(userID, userAPI);
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
    !userStorage[userID] && console.log(userStorage[userID], 'getting user from storage!!');
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

  // KEY VALUE STORAGE
  setKey: (userID, key, value) => {
    userStorage[userID].keyValuePairs[key] = value;
  },
  getKey: (userID, key) => {
    if (userStorage[userID].keyValuePairs[key]) {
      return structuredClone(userStorage[userID].keyValuePairs[key])
    } else {
      return null;
    }
  },
  deleteKey: (userID, key) => {
    delete userStorage[userID].keyValuePairs[key];
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
      count: messageStorage[userID].errorCount
    }
    messageStorage[userID].errorCount++;

    messageStorage[userID].errors.unshift(errorData);
    if (messageStorage[userID].errors.length > 1000) {
      messageStorage[userID].errors.length = 1000;
    }
    // console.log(socketStorage);
    // tell Dom to update errors
    socketStorage[userID].sockets.forEach(socket => {
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
    return messageStorage[userID].errors;
  },
  clearErrors: (userID) => {
    messageStorage[userID].errors.length = 0;
  },

  // MESSAGE STORAGE - store 1000 most recent messages
  storeMessage: (userID, message) => {
    // todo - chats are also being sent here so need to change this to differentiate type
    messageStorage[userID].newMessage(message);


    console.log(socketStorage[userID], 'do we need to go deeper?');

    // tell Dom to update messages and trade list if needed
    socketStorage[userID].sockets.forEach(socket => {
      // find all open sockets for the user
      if (socket.userID === userID) {
        console.log(socket.userID, 'equal?', socket.request.session.passport?.user)
        const msg = {
          type: 'messageUpdate',
          orderUpdate: message.orderUpdate,
        }
        socket.emit('message', msg);
      }
    })
    // // tell Dom to update messages and trade list if needed
    // cache.sockets.forEach(socket => {
    //   // find all open sockets for the user
    //   if (socket.userID === userID) {
    //     console.log(socket.userID, 'equal?', socket.request.session.passport?.user)
    //     const msg = {
    //       type: 'messageUpdate',
    //       orderUpdate: message.orderUpdate,
    //     }
    //     socket.emit('message', msg);
    //   }
    // })
  },

  // todo - chats are being sent to storeMessage, so need to get rid of this?
  // MESSAGE STORAGE - store 1000 most recent messages
  storeChat: (userID, chat) => {
    console.log(chat, 'chat');
    if (!chat.text) {
      return
    }
    const chatData = {
      // message text is to store a custom chat message to show the user
      text: chat.text,
      // automatically store the timestamp
      timeStamp: new Date(),
      count: userStorage[userID].chatMessageCount
    }

    messageStorage[userID].chatMessageCount++;

    messageStorage[userID].chatMessages.unshift(chatData);
    if (messageStorage[userID].chatMessages.length > 1000) {
      messageStorage[userID].chatMessages.length = 1000;
    }
    // tell Dom to update chat messages and trade list if needed
    // cache.sockets.forEach(socket => {
    //   // find all open sockets for the user
    //   if (socket.userID === userID) {
    //     const msg = {
    //       type: 'messageUpdate',
    //       orderUpdate: false
    //     }
    //     socket.emit('message', msg);
    //   }
    // })
  },

  getMessages: (userID) => {
    return messageStorage[userID].messages;
  },

  getChatMessages: (userID) => {
    const chats = [];
    // get the messages
    const messages = structuredClone(messageStorage[userID].messages);
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
    messageStorage[userID].length = 0;
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
    console.log(apiStorage[userID], 'API STORAGE NOT A FUNCTION');
    return structuredClone(apiStorage[userID]);
  },

  // get all cache storage for a user but remove API before returning
  getSafeStorage: (userID) => {
    // create a deep copy of the user's storage object so that it can be changed
    console.log('getting safe storage');
    const safeStorage = userStorage[userID]
      ? structuredClone(userStorage[userID])
      : { user: null, api: null };
    return safeStorage;
  },

  addSocket: (userID, socket) => {
    socketStorage[userID].sockets.add(socket);
  },

  deleteSocket: (userID, socket) => {
    socketStorage[userID].sockets.delete(socket);
  },

  heartbeat: (userID, side) => {
    socketStorage[userID].heartbeat(userID, side)
  }
}

module.exports = cache;