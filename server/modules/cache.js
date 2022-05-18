const databaseClient = require("./databaseClient");

const cache = {
  // the storage array will store an object of different things at the index of the user id
  storage: [],

  // set up a storage cache for a new user
  newUser: async (userID) => {
    cache.storage[userID] = {
      botStatus: ['setup'],
      api: null
    };
    // cache the API from the db
    userAPI = await databaseClient.getUserAPI(userID);
    cache.storeAPI(userID, userAPI);
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

  // store and fetch API details for a user
  storeAPI: (userID, api) => {
    cache.storage[userID].api = api;
  },
  getAPI: (userID) => {
    return cache.storage[userID].api;
  }
}

module.exports = cache;