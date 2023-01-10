import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';


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
    // timout after 1 second
    const result = yield axios.post(`/api/trade/simulation`, action.payload, { timeout: 0 });

    yield put({ type: 'SET_SIMULATION_RESULT', payload: result.data });
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('POST simulation route has failed', error)
    if (error?.response?.status === 403) {
      yield put({ type: 'UNSET_USER' });
    } else {
      console.log('simulation has failed, manually getting results')
      yield put({ type: 'GET_SIMULATION_RESULTS' });
    }
  }
}

// get simulation results
function* getSimulationResults() {
  try {
    console.log('manually getting simulation results')
    const result = yield axios.get(`/api/trade/simulation`);
    console.log('result.data', result.data)
    if (result.data.simResults.length > 0) {
      yield put({ type: 'SET_SIMULATION_RESULT', payload: result.data });
    }
    // yield put({ type: 'SET_SIMULATION_RESULT', payload: result.data });
  } catch (error) {
    console.log('GET Simulation route has failed', error)
    if (error?.response?.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}


function* syncTrade(action) {
  try {
    yield axios.put(`/api/trade/`, action.payload);
  } catch (error) {
    console.log('PUT trade route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* tradeSaga() {
  yield takeLatest('START_TRADE', startTrade);
  yield takeLatest('AUTO_SETUP', autoSetup);
  // yield takeLatest('DELETE_TRADE', deleteTrade);
  yield takeLatest('SYNC_TRADE', syncTrade);
  yield takeLatest('SIMULATE_TRADES', simulation);
  yield takeLatest('GET_SIMULATION_RESULTS', getSimulationResults);
}

export default tradeSaga;
