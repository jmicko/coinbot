const databaseClient = require("./databaseClient");
const socketClient = require("./socketClient");

const cache = {
  // the storage array will store an object of different things at the index of the user id
  storage: [],

  // set up a storage cache for a new user
  newUser: async (user) => {
    const userID = user.id;
    cache.storage[userID] = {
      user: user,
      botStatus: ['setup'],
      errors: [],
      keyValuePairs: {},
      loopNumber: 0,
      api: null
    };
    // cache the API from the db
    try {
      userAPI = await databaseClient.getUserAPI(userID);
      cache.storeAPI(userID, userAPI);
    } catch (err) {
      console.log(err, 'error creating new user');
    }
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
      timeStamp: new Date()
    }
    cache.storage[userID].errors.unshift(errorData);
    if (cache.storage[userID].errors.length > 1000) {
      cache.storage[userID].errors.length = 1000;
    }
    // tell Dom to update errors
    socketClient.emit('message', {
      // error: `Internal server error from coinbase! Is the Coinbase Pro website down?`,
      errorUpdate: true,
      userID: Number(userID)
    });
  },

  getErrors: (userID) => {
    return cache.storage[userID].errors;
  },

  clearErrors: (userID) => {
    cache.storage[userID].errors.length = 0;
  },

  // LOOP COUNTER
  increaseLoopNumber: (userID) => {
    cache.storage[userID].loopNumber++;
  },

  getLoopNumber: (userID) => {
    return cache.storage[userID].loopNumber;
  },

  // API STORAGE
  storeAPI: (userID, api) => {
    cache.storage[userID].api = api;
  },
  getAPI: (userID) => {
    return cache.storage[userID].api;
  },

  // get all cache storage for a user but remove API before returning
  getSafeStorage: (userID) => {
    // create a deep copy of the user's storage object so that it can be changed
    const safeStorage = JSON.parse(JSON.stringify(cache.storage[userID]));
    // remove the api so sensitive details are not sent off server
    delete safeStorage.api;
    return safeStorage;
  }
}

module.exports = cache;