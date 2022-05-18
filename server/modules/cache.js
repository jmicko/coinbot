const databaseClient = require("./databaseClient");

const cache = {
  // the storage array will store an object of different things at the index of the user id
  storage: [],

  // set up a storage cache for a new user
  newUser: async (user) => {
    const userID = user.id;
    cache.storage[userID] = {
      user: user,
      botStatus: ['setup'],
      keyValuePairs: {},
      loopNumber: 0,
      api: null
    };
    // cache the API from the db
    userAPI = await databaseClient.getUserAPI(userID);
    cache.storeAPI(userID, userAPI);
  },

  setKey: (userID, key, value) => {
    cache.storage[userID].keyValuePairs[key] = value;
  },

  getKey: (userID, key) => {
    return cache.storage[userID].keyValuePairs[key];
  },

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

  increaseLoopNumber: (userID) => {
    cache.storage[userID].loopNumber++;
  },

  getLoopNumber: (userID) => {
    return cache.storage[userID].loopNumber;
  },

  // store and fetch API details for a user
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