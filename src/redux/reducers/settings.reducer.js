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

const scrollingReducer = (state = {canScroll: false}, action) => {
  switch (action.type) {
    case 'SET_SCROLL':
      return action.payload;

    default:
      return state;
  }
};

export default combineReducers({
  allSettingsReducer,
  scrollingReducer,
});
