import { combineReducers } from 'redux';


const feeReducer = (state = {}, action) => {
    switch (action.type) {
      case 'SET_FEES':
        return action.payload;
      default:
        return state;
    }
  };


const profitReducer = (state = [{sum: "0"}], action) => {
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
    feeReducer,
    profitReducer,
  });
  