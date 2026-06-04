import { Coinbase } from '../coinbaseClient.js';
import { databaseClient } from '../databaseClient.js';
import { devLog } from '../utilities.js';
import { messenger } from './messenger.js';
import { userStorage } from './userStorage.js';

const cbClients = new class {
  constructor() {
    this.apiStorage = new Object();
  }

  async updateAPI(userID, identifier) {
    devLog('updating api for user: ' + userID);
    const userAPI = await databaseClient.getUserAPI(userID);

    this.apiStorage[userID] = Object();
    Object.assign(this.apiStorage[userID], userAPI);

    if (userAPI?.name?.length && userAPI?.privateKey?.length) {
      this[userID] = new Coinbase(userAPI.CB_ACCESS_KEY, userAPI.CB_SECRET, userAPI);
      userStorage.activate(userID, true, identifier);
    } else {
      delete this[userID];
      userStorage.setSocketStatus(userID, 'missing_api_credentials');
      messenger[userID]?.userUpdate(identifier);
    }
  }
};

export { cbClients };
