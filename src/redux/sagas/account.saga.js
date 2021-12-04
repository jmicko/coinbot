import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';


function* fetchFees(action) {
  try {
    console.log('payload is:', action.payload);
    const response = yield axios.get(`/api/account/fees`, action.payload);
    yield put({ type: 'SET_FEES', payload: response.data })
  } catch (error) {
    console.log('GET fees route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* fetchProfits() {
  try {
    console.log('getting profits in saga');
    const response = yield axios.get(`/api/account/profits`);
    yield put({ type: 'SET_PROFITS', payload: response.data })
  } catch (error) {
    console.log('GET fees route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* fetchAccounts() {
  try {
    console.log('getting profits in saga');
    const response = yield axios.get(`/api/account/`);
    yield put({ type: 'SET_ACCOUNT', payload: response.data })
  } catch (error) {
    console.log('GET account route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* storeApi(action) {
  try {
    console.log('storing api');

    const response = yield axios.post(`/api/account/storeApi`, action.payload);
    console.log('response from storing api', response);
  } catch (error) {
    console.log('post account route storeApi has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* reinvest(action) {
  try {
    console.log('storing reinvest');
    const response = yield axios.put(`/api/account/reinvest`, action.payload);
    console.log('response from reinvest', response);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route reinvest has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* reinvestRatio(action) {
  try {
    console.log('storing reinvest ratio');
    const response = yield axios.put(`/api/account/reinvestRatio`, action.payload);
    console.log('response from reinvest ratio', response);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route reinvest ratio has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* factoryReset() {
  try {
    console.log('Factory Reset!');

    const response = yield axios.post(`/api/account/factoryReset`);
    console.log('response from factory reset', response);
    yield put({ type: 'UNSET_USER' });
  } catch (error) {
    console.log('post account route factoryReset has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* accountSaga() {
  yield takeLatest('FETCH_FEES', fetchFees);
  yield takeLatest('FETCH_ACCOUNT', fetchAccounts);
  yield takeLatest('FETCH_PROFITS', fetchProfits);
  yield takeLatest('STORE_API', storeApi);
  yield takeLatest('REINVEST', reinvest);
  yield takeLatest('REINVEST_RATIO', reinvestRatio);
  yield takeLatest('FACTORY_RESET', factoryReset);
}

export default accountSaga;
