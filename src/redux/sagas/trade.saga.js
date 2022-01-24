import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';

function* startTrade(action) {
  try {
    // console.log('startTrade payload is:', action.payload);
    const response = yield axios.post(`/api/trade/`, action.payload);
    // console.log('startTrade response is.....', response);
    yield put({ type: 'FETCH_ORDERS' });
  } catch (error) {
    console.log('POST order route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* autoSetup(action) {
  try {
    // console.log('autoSetup payload is:', action.payload);
    const response = yield axios.post(`/api/trade/autoSetup`, action.payload);
    // console.log('response is.....', response);
  } catch (error) {
    console.log('POST order route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* deleteTrade(action) {
  try {
    // console.log('deleteTrade payload is...', action.payload);
    const response = yield axios.delete(`/api/trade/`, { data: action.payload });
    // console.log('response is.....', response);
  } catch (error) {
    console.log('POST order route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* tradeSaga() {
  yield takeLatest('START_TRADE', startTrade);
  yield takeLatest('AUTO_SETUP', autoSetup);
  yield takeLatest('DELETE_TRADE', deleteTrade);
}

export default tradeSaga;
