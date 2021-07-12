import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';


function* startTrade(action) {
    try {
          const response = yield axios.post('/api/trade/start');
        //   console.log('back from server', response.data.rows);
        console.log('in the buy btc saga function');
        // now that the session has ended on the server
        // remove the client-side user object to let
        // the client-side code know the user is logged out
        yield put({ type: 'RETURN_TEST_3', payload: 'trading begun' });
    } catch (error) {
        console.log('Feedback get request failed', error);
    }
}

function* buybtc(action) {
    try {
          const response = yield axios.post('/api/trade/buybtc');
          console.log('back from server', response.data.rows);
        console.log('in the buy btc saga function');
        // now that the session has ended on the server
        // remove the client-side user object to let
        // the client-side code know the user is logged out
        yield put({ type: 'RETURN_TEST_3', payload: 'payload from saga file' });
    } catch (error) {
        console.log('Feedback get request failed', error);
    }
}

function* sellbtc(action) {
    try {
        console.log('in the sell btc saga function');
        // yield axios.get('/api/test/');
        const response = yield axios.get('/api/test');
        console.log('back from server', response);

        // now that the session has ended on the server
        // remove the client-side user object to let
        // the client-side code know the user is logged out
        yield put({ type: 'RETURN_TEST_3', payload: response });
    } catch (error) {
        console.log('Feedback get request failed', error);
    }
}

function* tradeSaga() {
    yield takeLatest('BUY_BTC', buybtc);
    yield takeLatest('SELL_BTC', sellbtc);
    yield takeLatest('START_TRADE', startTrade);
}

export default tradeSaga;
