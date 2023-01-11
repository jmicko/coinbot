import { combineReducers } from 'redux';


const scrollingReducer = (state = {canScroll: false}, action) => {
  switch (action.type) {
    case 'SET_SCROLL':
      return action.payload;

    default:
      return state;
  }
};

export default combineReducers({
  scrollingReducer,
});
