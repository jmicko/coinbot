import { combineReducers } from 'redux';

// registrationMessage holds the string that will display
// on the registration screen if there's an error
const feeReducer = (state = {}, action) => {
    switch (action.type) {
      case 'SET_FEES':
        return action.payload;
      default:
        return state;
    }
  };
  
  // make one object that has keys loginMessage, registrationMessage
  // these will be on the redux state at:
  // state.errors.loginMessage and state.errors.registrationMessage
  export default combineReducers({
    feeReducer,
  });
  