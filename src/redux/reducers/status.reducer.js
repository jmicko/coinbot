import { combineReducers } from 'redux';

// registrationMessage holds the string that will display
// on the registration screen if there's an error
const tickers = (state = { btc: 0, eth: 0 }, action) => {
  switch (action.type) {
    case 'SET_TICKER_PRICE':

      switch (action.payload.product_id) {
        case 'BTC-USD':
          // console.log('it is btc');
          const btcState = {...state};
          btcState.btc = action.payload.price;
          return btcState;
        case 'ETH-USD':
          // console.log('it is eth');
          const ethState = {...state};
          ethState.eth = action.payload.price;
          return ethState;

        default:
          console.log(action.payload, 'payload in set ticker price');
          return state;
      }
    default:
      return state;
  }
};

// make one object that has keys loginMessage, registrationMessage
// these will be on the redux state at:
// state.errors.loginMessage and state.errors.registrationMessage
export default combineReducers({
  tickers,
});
