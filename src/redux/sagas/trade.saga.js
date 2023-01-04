import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';

function* startBasicTrade(action) {
  try {
    yield axios.post(`/api/trade/basic`, action.payload);
    yield put({ type: 'FETCH_USER' });
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
    yield put({
      type: 'FETCH_ORDERS',
      payload: { product: action.payload.product_id }
    });
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

// handle simulation
function* simulation(action) {
  try {
    yield put({ type: 'SET_SIMULATION_RUNNING' });
    console.log('simulation action.payload', action.payload);
    const result = yield axios.post(`/api/trade/simulation`, action.payload);
    console.log('simulation result', result);
    yield put({ type: 'SET_SIMULATION_RESULT', payload: result.data });
  } catch (error) {
    console.log('POST order route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* syncTrade(action) {
  try {
    yield axios.put(`/api/trade/`, action.payload);
  } catch (error) {
    console.log('PUT order route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* tradeSaga() {
  yield takeLatest('START_TRADE', startTrade);
  yield takeLatest('START_BASIC_TRADE', startBasicTrade);
  yield takeLatest('AUTO_SETUP', autoSetup);
  // yield takeLatest('DELETE_TRADE', deleteTrade);
  yield takeLatest('SYNC_TRADE', syncTrade);
  yield takeLatest('SIMULATE_TRADES', simulation);
}

export default tradeSaga;
