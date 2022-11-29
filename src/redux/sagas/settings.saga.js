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
    yield axios.put(`/api/settings/loopSpeed`, action.payload);
    yield put({ type: 'FETCH_SETTINGS' })
  } catch (error) {
    console.log('setting bot speed has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* fullSync(action) {
  try {
    yield axios.put(`/api/settings/fullSync`, action.payload);
    yield put({ type: 'FETCH_SETTINGS' })
  } catch (error) {
    console.log('setting bot speed has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* syncQuantity(action) {
  try {
    yield axios.put(`/api/settings/orderSyncQuantity`, action.payload);
    yield put({ type: 'FETCH_SETTINGS' })
  } catch (error) {
    console.log('setting bot speed has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* toggleMaintenance(action) {
  try {
    yield axios.put(`/api/settings/toggleMaintenance`, action.payload);
    yield put({ type: 'FETCH_SETTINGS' })
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

function* ordersReset() {
  try {
    yield axios.post(`/api/settings/ordersReset`);
    yield put({ type: 'FETCH_ORDERS' });
  } catch (error) {
    console.log('post account route factoryReset has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* factoryReset() {
  try {
    yield axios.post(`/api/settings/factoryReset`);
    yield put({ type: 'UNSET_USER' });
  } catch (error) {
    console.log('post account route factoryReset has failed', error);
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
  yield takeLatest('FETCH_SETTINGS', getAllSettings);
  yield takeLatest('SEND_LOOP_SPEED', loopSpeed);
  yield takeLatest('SEND_FULL_SYNC', fullSync);
  yield takeLatest('SEND_SYNC_QUANTITY', syncQuantity);
  yield takeLatest('SET_BULK_PAIR_RATIO', bulkPairRatio);
  yield takeLatest('SET_PROFIT_ACCURACY', sendProfitAccuracy);
  yield takeLatest('SET_MAX_TRADE_LOAD', sendTradeLoadMax);
  yield takeLatest('POST_MAX_REINVEST_RATIO', postMaxReinvestRatio);
  yield takeLatest('SAVE_RESERVE', reserve);
  yield takeLatest('TOGGLE_MAINTENANCE', toggleMaintenance);
  yield takeLatest('KILL_LOCK', killLock);
  yield takeLatest('ORDERS_RESET', ordersReset);
  yield takeLatest('FACTORY_RESET', factoryReset);
  yield takeLatest('TEST', test);
}

export default settingsSaga;
