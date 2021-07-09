import { combineReducers } from 'redux';

// registrationMessage holds the string that will display
// on the registration screen if there's an error
const testReducer = (state = '', action) => {
    switch (action.type) {
      case 'RETURN_TEST_1':
        return 'TEST 1';
      case 'RETURN_TEST_2':
        return 'TEST 2';
      case 'RETURN_TEST_3':
        return action.payload.data;
      default:
        return state;
    }
  };
  
  // make one object that has keys loginMessage, registrationMessage
  // these will be on the redux state at:
  // state.errors.loginMessage and state.errors.registrationMessage
  export default combineReducers({
    testReducer,
  });
  