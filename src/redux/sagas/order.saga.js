import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';


function* deleteRange(action) {
  try {
    yield axios.delete(`/api/orders/range`, { data: action.payload });
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
    // yield put({ type: 'FETCH_ORDERS' });
  } catch (error) {
    console.log('DELETE all orders route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* deleteAllOrdersForProduct(action) {
  try {
    yield axios.delete(`/api/orders/product/${action.payload.product_id}`);
    // yield put({ type: 'FETCH_ORDERS' });
  } catch (error) {
    console.log('DELETE all orders for product route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}


function* deleteOrder(action) {
  try {
    yield axios.delete(`/api/orders/${action.payload.order_id}`);
  } catch (error) {
    console.log('DELETE order route has failed', error)
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* orderSaga() {
  yield takeLatest('DELETE_ALL_ORDERS', deleteAllOrders);
  yield takeLatest('DELETE_ALL_PRODUCT_ORDERS', deleteAllOrdersForProduct);
  yield takeLatest('DELETE_RANGE', deleteRange);
  yield takeLatest('DELETE_TRADE', deleteOrder);
}

export default orderSaga;
