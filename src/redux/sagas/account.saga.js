import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';




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
  yield takeLatest('EXPORT_XLSX', exportXlsx);

}

export default accountSaga;
