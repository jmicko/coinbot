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
      default:
        return state;
    }
  };


const profitsReducer = (state = [{sum: "0"}], action) => {
    switch (action.type) {
      case 'SET_PROFITS':
        return action.payload;
      default:
        return state;
    }
  };
  
  // make one object that has keys loginMessage, registrationMessage
  // these will be on the redux state at:
  // state.errors.loginMessage and state.errors.registrationMessage
  export default combineReducers({
    userReducer,
    feeReducer,
    profitsReducer,
  });
  