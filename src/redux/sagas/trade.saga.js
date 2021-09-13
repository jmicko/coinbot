import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';


function* toggleBot(action) {
  try {
    const response = yield axios.post(`/api/trade/toggle`);
    console.log('response is.....', response);
  } catch (error) {
    console.log('POST toggle route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* startTrade(action) {
  try {
    console.log('payload is:', action.payload);
    const response = yield axios.post(`/api/trade/`, action.payload);
    console.log('response is.....', response);
  } catch (error) {
    console.log('POST order route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* deleteTrade(action) {
  try {
    console.log('payload is...', action.payload);
    const response = yield axios.delete(`/api/trade/`, { data: action.payload });
    console.log('response is.....', response);
  } catch (error) {
    console.log('POST order route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* tradeSaga() {
  yield takeLatest('TOGGLE_BOT', toggleBot);
  yield takeLatest('START_TRADE', startTrade);
  yield takeLatest('DELETE_TRADE', deleteTrade);
}

export default tradeSaga;
