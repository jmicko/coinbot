import { combineReducers } from 'redux';


const allSettingsReducer = (state = {}, action) => {
  switch (action.type) {
    case 'SET_ALL_SETTINGS':
      return action.payload;
    case 'UNSET_ALL_SETTINGS':
      return {};
    default:
      return state;
  }
};

export default combineReducers({
  allSettingsReducer,
});
