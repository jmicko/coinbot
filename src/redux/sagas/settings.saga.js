import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';



function* bulkPairRatio(action) {
  try {
    yield axios.put(`/api/settings/bulkPairRatio`, action.payload);
    // yield put({ type: 'FETCH_ORDERS' })
  } catch (error) {
    console.log('setting bot speed has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* sendTradeLoadMax(action) {
  try {
    yield axios.put(`/api/settings/tradeLoadMax`, action.payload);
    // yield put({ type: 'FETCH_ORDERS' })
    yield put({ type: 'FETCH_USER' })
  } catch (error) {
    console.log('sendTradeLoadMax saga has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* postMaxReinvestRatio(action) {
  try {
    yield axios.put(`/api/settings/postMaxReinvestRatio`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route reinvest ratio has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* reserve(action) {
  try {
    yield axios.put(`/api/settings/reserve`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route reserve has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* sendProfitAccuracy(action) {
  try {
    yield axios.put(`/api/settings/profitAccuracy`, action.payload);
    yield put({ type: 'FETCH_USER' })
  } catch (error) {
    console.log('sendTradeLoadMax saga has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* killLock(action) {
  try {
    yield axios.put(`/api/settings/killLock`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route killLock has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}


function* test() {
  try {
    const response = yield axios.get(`/api/settings/test/cheese`);
    console.log(response, '<- response from test');
  } catch (error) {
    console.log('post account route factoryReset has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* settingsSaga() {
  yield takeLatest('SET_BULK_PAIR_RATIO', bulkPairRatio);
  yield takeLatest('SET_PROFIT_ACCURACY', sendProfitAccuracy);
  yield takeLatest('SET_MAX_TRADE_LOAD', sendTradeLoadMax);
  yield takeLatest('POST_MAX_REINVEST_RATIO', postMaxReinvestRatio);
  yield takeLatest('SAVE_RESERVE', reserve);
  yield takeLatest('KILL_LOCK', killLock);
  yield takeLatest('TEST', test);
}

export default settingsSaga;
