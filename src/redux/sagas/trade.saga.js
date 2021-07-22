import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';


function* toggleBot(action) {
    try {
        const response = yield axios.post(`/api/trade/toggle`);
        console.log('response is.....', response);
    } catch (error) {
        console.log('POST toggle route has failed', error)
    }
}

function* startTrade(action) {
    try {
        const response = yield axios.post(`/api/trade/order`, action.payload);
        console.log('response is.....', response);
    } catch (error) {
        console.log('POST order route has failed', error)
    }
}

function* tradeSaga() {
    yield takeLatest('TOGGLE_BOT', toggleBot);
    // yield takeLatest('BUY_BTC', buybtc);
    // yield takeLatest('SELL_BTC', sellbtc);
    yield takeLatest('START_TRADE', startTrade);
}

export default tradeSaga;
