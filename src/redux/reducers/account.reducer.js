import { combineReducers } from 'redux';

const userReducer = (state = {}, action) => {
  switch (action.type) {
    case 'SET_USER':
      console.log('setting user', action.payload);
      return action.payload;
    case 'UNSET_USER':
      return {};
    default:
      return state;
  }
};

const feeReducer = (state = {}, action) => {
  switch (action.type) {
    case 'SET_FEES':
      return action.payload;
    case 'UNSET_FEES':
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

const accountReducer = (state = [{ available: 0 }], action) => {
  switch (action.type) {
    case 'SET_ACCOUNT':
      return action.payload;
    case 'UNSET_ACCOUNT':
      return [{ available: 0 }];
    default:
      return state;
  }
};

export default combineReducers({
  userReducer,
  feeReducer,
  profitsReducer,
  accountReducer,
});
