import { databaseClient } from '../databaseClient.js';
import { devLog } from '../utilities.js';
import { cbClients } from './coinbaseClients.js';
import { messenger } from './messenger.js';

const userStates = new Map();
const userIDs = new Set();

const dbBackedUserFields = [
  ['userID', 'id'],
  ['username', 'username'],
  ['admin', 'admin'],
  ['active', 'active'],
  ['approved', 'approved'],
  ['paused', 'paused'],
  ['joined_at', 'joined_at'],
  ['kill_locked', 'kill_locked'],
  ['theme', 'theme'],
  ['reinvest', 'reinvest'],
  ['reinvest_ratio', 'reinvest_ratio'],
  ['post_max_reinvest_ratio', 'post_max_reinvest_ratio'],
  ['reserve', 'reserve'],
  ['maker_fee', 'maker_fee'],
  ['taker_fee', 'taker_fee'],
  ['usd_volume', 'usd_volume'],
  ['max_trade', 'max_trade'],
  ['max_trade_size', 'max_trade_size'],
  ['max_trade_load', 'max_trade_load'],
  ['sync_quantity', 'sync_quantity'],
  ['profit_accuracy', 'profit_accuracy'],
  ['auto_setup_number', 'auto_setup_number'],
  ['profit_reset', 'profit_reset'],
  ['can_chat', 'can_chat'],
];

function normalizeUserID(userID) {
  return Number(userID);
}

function hasSettings(user) {
  return Object.prototype.hasOwnProperty.call(user, 'paused');
}

function applyDbUserFields(state, user) {
  dbBackedUserFields.forEach(([stateKey, userKey]) => {
    state[stateKey] = user[userKey];
  });
}

function createRuntimeUser(user) {
  const state = {
    availableFunds: {},
    botStatus: ['setup'],
    willCancel: new Set(),
    ordersToCheck: [],
    loopNumber: 0,
    deleting: false,
    socketStatus: 'closed',
    candlesBeingUpdated: {},
    exporting: false,
    simulating: false,
    simulationResults: null,
    timeouts: [],
  };

  applyDbUserFields(state, user);
  return state;
}

function getRuntimeUser(userID) {
  return userStates.get(normalizeUserID(userID));
}

function requireRuntimeUser(userID) {
  const state = getRuntimeUser(userID);
  if (!state) {
    throw new Error(`Runtime user state not found for user ${userID}`);
  }
  return state;
}

function clonePublicState(state) {
  const publicState = { ...state };
  delete publicState.timeouts;
  return structuredClone(publicState);
}

const userStorage = {
  async createNewUser(user) {
    const userID = normalizeUserID(user.id);
    const userAndSettings = hasSettings(user)
      ? user
      : await databaseClient.getUserAndSettings(userID);

    userStates.set(userID, createRuntimeUser(userAndSettings));
    userIDs.add(userID);

    messenger.newMessenger(userID);

    try {
      await cbClients.updateAPI(userID);
    } catch (err) {
      devLog(err, `\nERROR creating new user`);
    }
  },

  getUser(userID) {
    const state = getRuntimeUser(userID);
    return state ? clonePublicState(state) : undefined;
  },

  getAllUsers() {
    return structuredClone([...userIDs]);
  },

  deleteUser(userID) {
    try {
      const normalizedUserID = normalizeUserID(userID);
      const state = getRuntimeUser(normalizedUserID);

      devLog(normalizedUserID, '<-user to delete', [...userIDs]);
      userIDs.delete(normalizedUserID);

      if (state) {
        state.deleting = true;
      }
      messenger[normalizedUserID]?.orderUpdate();
    } catch (err) {
      devLog(err, 'error deleting user');
    }
  },

  async refreshUser(userID, identifier) {
    const state = requireRuntimeUser(userID);
    const user = await databaseClient.getUserAndSettings(state.userID);
    applyDbUserFields(state, user);
    messenger[state.userID]?.userUpdate(identifier);
  },

  approve(userID, approved) {
    const state = requireRuntimeUser(userID);
    state.approved = approved;
    messenger[state.userID]?.userUpdate();
  },

  activate(userID, active, identifier) {
    const state = requireRuntimeUser(userID);
    state.active = active;
    messenger[state.userID]?.userUpdate(identifier);
  },

  setSocketStatus(userID, socketStatus) {
    const state = getRuntimeUser(userID);
    if (state) {
      state.socketStatus = socketStatus;
    }
  },

  getSocketStatus(userID) {
    return getRuntimeUser(userID)?.socketStatus ?? 'closed';
  },

  updateStatus(userID, update) {
    const state = requireRuntimeUser(userID);
    state.botStatus.unshift(update);
    if (state.botStatus.length > 100) {
      state.botStatus.length = 100;
    }
  },

  clearStatus(userID) {
    requireRuntimeUser(userID).botStatus.length = 0;
  },

  increaseLoopNumber(userID) {
    requireRuntimeUser(userID).loopNumber += 1;
  },

  getLoopNumber(userID) {
    return getRuntimeUser(userID)?.loopNumber ?? 0;
  },

  getAvailableFunds(userID) {
    const state = getRuntimeUser(userID);
    return state ? structuredClone(state.availableFunds) : {};
  },

  updateAvailableFunds(userID, funds) {
    requireRuntimeUser(userID).availableFunds = funds;
  },

  updateFees(userID, { makerFee, takerFee, usdVolume }) {
    const state = requireRuntimeUser(userID);
    state.maker_fee = makerFee;
    state.taker_fee = takerFee;
    state.usd_volume = usdVolume;
  },

  queueOrdersToCheck(userID, orders) {
    requireRuntimeUser(userID).ordersToCheck = orders;
  },

  getOrdersToCheck(userID) {
    const state = getRuntimeUser(userID);
    return state ? structuredClone(state.ordersToCheck) : [];
  },

  clearOrdersToCheck(userID) {
    requireRuntimeUser(userID).ordersToCheck = [];
  },

  markWillCancel(userID, orderID) {
    requireRuntimeUser(userID).willCancel.add(orderID);
  },

  willCancel(userID, orderID) {
    return requireRuntimeUser(userID).willCancel.has(orderID);
  },

  sendOrderUpdate(userID) {
    messenger[normalizeUserID(userID)]?.newMessage({ type: 'orderUpdate', orderUpdate: true });
  },

  sendMessageUpdate(userID) {
    messenger[normalizeUserID(userID)]?.newMessage({ type: 'messageUpdate', messageUpdate: true });
  },

  updateCandlesBeingUpdated(userID, product_id, granularity, isUpdating) {
    const state = requireRuntimeUser(userID);
    if (!state.candlesBeingUpdated[product_id]) {
      state.candlesBeingUpdated[product_id] = {};
    }
    state.candlesBeingUpdated[product_id][granularity] = isUpdating;
  },

  getTimeoutForSub(userID, sub) {
    const state = getRuntimeUser(userID);
    return state
      ? state.timeouts.filter(timeout => timeout.subscription.endpoint === sub.endpoint)
      : [];
  },

  addTimeout(userID, timeout) {
    requireRuntimeUser(userID).timeouts.push(timeout);
  },

  isExporting(userID) {
    return Boolean(getRuntimeUser(userID)?.exporting);
  },

  setExporting(userID, exporting) {
    requireRuntimeUser(userID).exporting = exporting;
  },

  isSimulating(userID) {
    return Boolean(getRuntimeUser(userID)?.simulating);
  },

  setSimulating(userID, simulating) {
    requireRuntimeUser(userID).simulating = simulating;
  },

  getSimulationResults(userID) {
    return getRuntimeUser(userID)?.simulationResults ?? null;
  },

  setSimulationResults(userID, simulationResults) {
    requireRuntimeUser(userID).simulationResults = simulationResults;
  },
};

export { userStorage };
