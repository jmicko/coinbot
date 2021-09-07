import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';


function* fetchOrders() {
  try {
      const response = yield axios.get(`/api/orders/`);
    //   console.log('orders response is.....', response.data);
      yield put({ type: 'SET_ORDERS', payload: response.data})
  } catch (error) {
      console.log('GET orders route has failed', error)
  }
}

function* syncOrders() {
  try {
      const response = yield axios.put(`/api/orders/`);
      console.log('sync orders response is.....', response);
  } catch (error) {
      console.log('PUT orders route has failed', error)
  }
}

function* orderSaga() {
    yield takeLatest('FETCH_ORDERS', fetchOrders);
    yield takeLatest('SYNC_ORDERS', syncOrders);
}

export default orderSaga;
