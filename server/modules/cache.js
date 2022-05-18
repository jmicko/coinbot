const cache = {
  // the storage array will store an object of different things at the index of the user id
  storage: [],

  // set up a storage cache for a new user
  newUser: (userID) => {
    cache.storage[userID] = {
      botStatus: ['setup'],
      api: null
    };
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