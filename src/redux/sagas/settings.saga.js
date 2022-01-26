import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';



function* getAllSettings() {
  try {
    const response = yield axios.get(`/api/settings`);
    yield put({ type: 'SET_ALL_SETTINGS', payload: response.data })
  } catch (error) {
    console.log('getting all settings has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* loopSpeed(action) {
  try {
    const response = yield axios.put(`/api/settings/loopSpeed`, action.payload);
    yield put({ type: 'FETCH_SETTINGS', payload: response.data })
  } catch (error) {
    console.log('setting bot speed has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* toggleMaintenance(action) {
  try {
    const response = yield axios.put(`/api/settings/toggleMaintenance`, action.payload);
    yield put({ type: 'FETCH_SETTINGS', payload: response.data })
  } catch (error) {
    console.log('setting bot speed has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* bulkPairRatio(action) {
  try {
    yield axios.put(`/api/settings/bulkPairRatio`, action.payload);
    yield put({ type: 'FETCH_ORDERS' })
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
    yield put({ type: 'FETCH_ORDERS' })
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


function* settingsSaga() {
  yield takeLatest('FETCH_SETTINGS', getAllSettings);
  yield takeLatest('SEND_LOOP_SPEED', loopSpeed);
  yield takeLatest('SET_BULK_PAIR_RATIO', bulkPairRatio);
  yield takeLatest('SET_MAX_TRADE_LOAD', sendTradeLoadMax);
  yield takeLatest('TOGGLE_MAINTENANCE', toggleMaintenance);
  yield takeLatest('KILL_LOCK', killLock);
}

export default settingsSaga;
