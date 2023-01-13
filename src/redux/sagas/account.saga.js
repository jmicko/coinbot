import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';



function* storeApi(action) {
  try {
    yield axios.post(`/api/account/storeApi`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    // console.log('post account route storeApi has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
    if (error.response.status === 500) {
      yield put({ type: 'REGISTRATION_FAILED' });
    }
  }
}


function* exportXlsx() {
  try {
    const response = yield axios.get(`/api/account/exportXlsx`);
    yield put({ type: 'SET_XLSX', payload: response })
  } catch (error) {
    console.log('export xlsx route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}






function* accountSaga() {
  // yield takeLatest('STORE_API', storeApi);
  yield takeLatest('EXPORT_XLSX', exportXlsx);

}

export default accountSaga;
