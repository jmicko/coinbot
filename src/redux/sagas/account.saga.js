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
    const response = yield axios.post(`/api/account/storeApi`);
    // yield put({ type: 'SET_ACCOUNT', payload: response.data })
  } catch (error) {
    console.log('post account route storeApi has failed', error);
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
}

export default accountSaga;
