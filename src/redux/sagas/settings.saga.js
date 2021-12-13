import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';



function* loopSpeed(action) {
  try {
    console.log('setting bot speed');
    const response = yield axios.put(`/api/settings/loopSpeed`, action.payload);
    console.log('response from loopSpeed', response);
  } catch (error) {
    console.log('put account route reinvest ratio has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}


function* settingsSaga() {
  yield takeLatest('SEND_LOOP_SPEED', loopSpeed);
}

export default settingsSaga;
