import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';


function* fetchOrders() {
  try {
    const response = yield axios.get(`/api/orders/`);
    yield put({ type: 'SET_ORDERS', payload: response.data })
  } catch (error) {
    console.log('GET orders route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* syncOrders() {
  try {
    yield axios.put(`/api/orders/`);
  } catch (error) {
    console.log('PUT orders route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* deleteRange(action) {
  try {
    yield axios.delete(`/api/orders/range`, { data: action.payload });
    yield put({ type: 'FETCH_ORDERS' });
  } catch (error) {
    console.log('DELETE all orders route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* deleteAllOrders() {
  try {
    yield axios.delete(`/api/orders/all`);
    yield put({ type: 'FETCH_ORDERS' });
  } catch (error) {
    console.log('DELETE all orders route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* orderSaga() {
  yield takeLatest('FETCH_ORDERS', fetchOrders);
  yield takeLatest('SYNC_ORDERS', syncOrders);
  yield takeLatest('DELETE_ALL_ORDERS', deleteAllOrders);
  yield takeLatest('DELETE_RANGE', deleteRange);
}

export default orderSaga;
