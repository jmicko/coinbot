import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';

function* startBasicTrade(action) {
  try {
    yield axios.post(`/api/trade/basic`, action.payload);
    // yield put({ type: 'FETCH_ORDERS' });
  } catch (error) {
    console.log('POST basic trade route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* startTrade(action) {
  try {
    yield axios.post(`/api/trade/`, action.payload);
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
    yield axios.post(`/api/trade/autoSetup`, action.payload);
  } catch (error) {
    console.log('POST order route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* deleteTrade(action) {
  try {
    yield axios.delete(`/api/trade/`, { data: action.payload });
  } catch (error) {
    console.log('POST order route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* tradeSaga() {
  yield takeLatest('START_TRADE', startTrade);
  yield takeLatest('START_BASIC_TRADE', startBasicTrade);
  yield takeLatest('AUTO_SETUP', autoSetup);
  yield takeLatest('DELETE_TRADE', deleteTrade);
}

export default tradeSaga;
