import { combineReducers } from 'redux';

const userReducer = (state = {}, action) => {
  switch (action.type) {
    case 'SET_USER':
      // console.log('setting user', action.payload);
      return action.payload;
    case 'UNSET_USER':
      return {};
    default:
      return state;
  }
};

// reducer for holding the user's products
const productsReducer = (state = [], action) => {
  switch (action.type) {
    case 'SET_PRODUCTS':
      return action.payload;
    case 'UNSET_PRODUCTS':
      return [];
    default:
      return state;
  }
};

const profitsReducer = (state = [{ sum: "0" }], action) => {
  switch (action.type) {
    case 'SET_PROFITS':
      return action.payload;
    case 'UNSET_PROFITS':
      return [{ sum: "0" }];
    default:
      return state;
  }
};

// does this do anything?
// const accountReducer = (state = 0, action) => {
//   switch (action.type) {
//     case 'SET_ACCOUNT':
//       return action.payload;
//     case 'UNSET_ACCOUNT':
//       return 0;
//     default:
//       return state;
//   }
// };

const xlsxReducer = (state = [], action) => {
  switch (action.type) {
    case 'SET_XLSX':
      return action.payload;
    case 'UNSET_XLSX':
      return [];
    default:
      return state;
  }
};

const currentJSONReducer = (state = false, action) => {
  switch (action.type) {
    case 'SET_CURRENT_JSON':
      return action.payload;
    case 'UNSET_CURRENT_JSON':
      return false;
    default:
      return state;
  }
};

const debugReducer = (state = [], action) => {
  switch (action.type) {
    case 'SET_DEBUG':
      console.log('action.payload', action.payload);
      console.log(action.payload, 'payload');
      const userInfo = action.payload;
      // copy old state
      const newState = [...state];
      // replace user info at user.id index of new state
      newState[userInfo.id] = userInfo;
      return newState;
    case 'UNSET_ALL_DEBUG':
      return [];
    default:
      return state;
  }
};

const botMessages = (state = [], action) => {
  switch (action.type) {
    case 'CLEAR_BOT_MESSAGES':
      return [];
    case 'SET_BOT_MESSAGES':
      return action.payload;
    default:
      return state;
  }
};

const chatMessages = (state = [], action) => {
  switch (action.type) {
    case 'CLEAR_CHAT_MESSAGES':
      return [];
    case 'SET_CHAT_MESSAGES':
      return action.payload;
    default:
      return state;
  }
};

// store user's list of files for export
const exportFilesReducer = (state = [], action) => {
  switch (action.type) {
    case 'SET_EXPORT_FILES':
      console.log('setting files', action.payload);
      return action.payload;
    case 'UNSET_EXPORT_FILES':
      return [];
    default:
      return state;
  }
};

// store the results of the simulation
const simulationReducer = (state = { status: 'idle' }, action) => {
  switch (action.type) {
    case 'SET_SIMULATION_RESULT':
      return { status: 'complete', result: action.payload}
    case 'UNSET_SIMULATION_RESULT':
      return { status: 'idle' };
    case 'SET_SIMULATION_RUNNING':
      return { status: 'running' };
    default:
      return state;
  }
};


export default combineReducers({
  userReducer,
  // feeReducer,
  profitsReducer,
  productsReducer,
  // accountReducer,
  xlsxReducer,
  currentJSONReducer,
  debugReducer,
  botMessages,
  chatMessages,
  exportFilesReducer,
  simulationReducer,
});
