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

const accountReducer = (state = 0, action) => {
  switch (action.type) {
    case 'SET_ACCOUNT':
      return action.payload;
    case 'UNSET_ACCOUNT':
      return 0;
    default:
      return state;
  }
};

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

      const userInfo = action.payload;

      const newState = [...state];

      newState[userInfo.user.id] = userInfo;

      
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


export default combineReducers({
  userReducer,
  // feeReducer,
  profitsReducer,
  accountReducer,
  xlsxReducer,
  currentJSONReducer,
  debugReducer,
  botMessages,
});
