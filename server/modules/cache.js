const cache = {
  // the storage array will store an object of different things at the index of the user id
  storage: [],
  storeAPI: (userID, api) => {
    cache.storage[userID].api = api;
  },
  getAPI: (userID) => {
    return cache.storage[userID].api;
  }
}

module.exports = cache;