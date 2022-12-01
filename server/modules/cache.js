const databaseClient = require("./databaseClient");

const botSettings = {
  loop_speed: Number(),
  orders_to_sync: Number(),
  full_sync: Number(),
  maintenance: Boolean()
};
const userStorage = [];

const apiStorage = [];

const cache = {
  // the storage array will store an object of different things at the index of the user id
  storage: [],

  setBotSettings: (newSettings) => {
    Object.assign(botSettings, newSettings)
  },
  getBotSettings: () => {
    if (botSettings) {
      return structuredClone(botSettings)
    }
  },
  refreshBotSettings: async () => {
    const botSettings = await databaseClient.getBotSettings();
    // save settings to the cache
    cache.setBotSettings(botSettings)
  },

  // set up a storage cache for a new user
  createNewUser: async (user) => {
    // get the user id
    const userID = user.id;
    // delete password. we don't need it here
    delete user.password
    // insert the user at the array index matching their id
    cache.storage[userID] = {
      ...user,
      botStatus: ['setup'],
      errors: Array(),
      messages: Array(),
      chatMessages: Array(),
      // hold orders that will be canceled so bot can check against them before reordering
      willCancel: new Set(),
      keyValuePairs: Object(),
      loopNumber: Number(),
      api: null,
      messageCount: 1,
      chatMessageCount: 1,
      errorCount: 1
    };

    // create user object at index of user id
    userStorage[userID] = Object();
    // add the user to the userStorage array
    Object.assign(userStorage[userID], cache.storage[userID])

    // cache the API from the db
    try {
      // console.log(cache.storage[userID], 'USER');
      const userAPI = await databaseClient.getUserAPI(userID);
      cache.storeAPI(userID, userAPI);
      
      // create api object at index of user id
      apiStorage[userID] = Object();
      // add the user to the apiStorage array
      Object.assign(apiStorage[userID], userAPI)
      
      // console.log(apiStorage, 'new storage array');
      await cache.refreshUser(user.id);
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
    cache.storage[userID] = (user) ? { ...cache.storage[userID], ...user } : null;
    // get and store the api from the db
    userAPI = await databaseClient.getUserAPI(userID);
    cache.storeAPI(userID, userAPI);
  },

  // KEEP TRACK OF ORDERS TO CANCEL
  setCancel: (userID, orderID) => {
    const userStore = cache.storage[userID]
    // add the id to the willCancel set
    userStore.willCancel.add(orderID);
    // delete the id from the set after 30 seconds. Bot would have seen it by then
    setTimeout(() => {
      userStore.willCancel.delete(orderID)
    }, 30 * 1000);

  },

  checkIfCanceling: (userID, orderID) => {
    const userStore = cache.storage[userID]
    // find if id is in the willCancel set
    return userStore.willCancel.has(orderID)
  },

  getUser: (userID) => {
    // make a deep copy so you don't delete the api from the user
    const user = structuredClone(cache.storage[userID])
    delete user.api
    // console.log(user.api,'user api to delete');
    return user
  },

  getAllUsers: () => {
    let allUsers = []
    cache.storage.forEach(user => {
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
    cache.storage[userID].keyValuePairs[key] = value;
  },
  getKey: (userID, key) => {
    if (cache.storage[userID].keyValuePairs[key]) {
      return JSON.parse(JSON.stringify(cache.storage[userID].keyValuePairs[key]))
    } else {
      return null;
    }
  },
  deleteKey: (userID, key) => {
    delete cache.storage[userID].keyValuePairs[key];
  },

  // LOOP STATUS UPDATES
  updateStatus: (userID, update) => {
    cache.storage[userID].botStatus.unshift(update);
    if (cache.storage[userID].botStatus.length > 100) {
      cache.storage[userID].botStatus.length = 100;
    }
  },
  getStatus: (userID) => {
    return cache.storage[userID].botStatus;
  },
  clearStatus: (userID) => {
    cache.storage[userID].botStatus.length = 0;
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
      count: cache.storage[userID].errorCount
    }
    cache.storage[userID].errorCount++;

    cache.storage[userID].errors.unshift(errorData);
    if (cache.storage[userID].errors.length > 1000) {
      cache.storage[userID].errors.length = 1000;
    }

    // tell Dom to update errors
    cache.sockets.forEach(socket => {
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
    return cache.storage[userID].errors;
  },
  clearErrors: (userID) => {
    cache.storage[userID].errors.length = 0;
  },

  // MESSAGE STORAGE - store 1000 most recent messages
  storeMessage: (userID, message) => {
    console.log(message, 'message')
    const messageData = {
      type: message.type,
      // message text is to store a custom message message to show the user
      messageText: message.messageText,
      // automatically store the timestamp
      timeStamp: new Date(),
      count: cache.storage[userID].messageCount
    }
    cache.storage[userID].messageCount++;

    cache.storage[userID].messages.unshift(messageData);
    if (cache.storage[userID].messages.length > 1000) {
      cache.storage[userID].messages.length = 1000;
    }
    // tell Dom to update messages and trade list if needed
    cache.sockets.forEach(socket => {
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
  },

  // MESSAGE STORAGE - store 1000 most recent messages
  storeChat: (userID, chat) => {
    console.log(chat, 'chat');
    const chatData = {
      // message text is to store a custom chat message to show the user
      messageText: chat.text,
      // automatically store the timestamp
      timeStamp: new Date(),
      count: cache.storage[userID].chatMessageCount
    }

    cache.storage[userID].chatMessageCount++;

    cache.storage[userID].chatMessages.unshift(chatData);
    if (cache.storage[userID].chatMessages.length > 1000) {
      cache.storage[userID].chatMessages.length = 1000;
    }
    // tell Dom to update chat messages and trade list if needed
    cache.sockets.forEach(socket => {
      // find all open sockets for the user
      if (socket.userID === userID) {
        console.log(socket.userID, 'equal?', socket.request.session.passport?.user)
        const msg = {
          type: 'messageUpdate',
          orderUpdate: false
        }
        socket.emit('message', msg);
      }
    })
  },

  getMessages: (userID) => {
    return cache.storage[userID].messages;
  },

  getChatMessages: (userID) => {
    const chats = [];
    const messages = JSON.parse(JSON.stringify(cache.storage[userID].messages));
    messages.forEach(message => {
      if (message.type === 'chat') {
        chats.push(message);
      }
    });
    console.log(chats, 'CHAT TO GET');
    return chats;
  },

  clearMessages: (userID) => {
    cache.storage[userID].messages.length = 0;
  },

  // LOOP COUNTER
  increaseLoopNumber: (userID) => {
    // throwing an error here on 1st user creation
    cache.storage[userID].loopNumber++;
  },

  getLoopNumber: (userID) => {
    return cache.storage[userID].loopNumber;
  },

  // API STORAGE
  storeAPI: (userID, api) => {
    cache.storage[userID].api = api;
    // console.log(cache.storage[userID],'DID IT PUT THE USER TOGETHER CORRECTLY')
  },
  getAPI: (userID) => {
    return cache.storage[userID].api;
  },

  // get all cache storage for a user but remove API before returning
  getSafeStorage: (userID) => {
    // create a deep copy of the user's storage object so that it can be changed
    // this threw an error when the bot froze up
    // maybe because there was no storage object for the user so it threw undefined?
    // error says unexpected character "u"

    console.log('getting safe storage');
    const safeStorage = cache.storage[userID]
      ? JSON.parse(JSON.stringify(cache.storage[userID]))
      : { user: null, api: null };
    // remove the api so sensitive details are not sent off server
    delete safeStorage.api;
    return safeStorage;
  },

  // socket.io connections
  sockets: new Set()
}

module.exports = cache;