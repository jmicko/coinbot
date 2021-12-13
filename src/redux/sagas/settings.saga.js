import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';



function* getAllSettings() {
  try {
    console.log('getting all settings');
    const response = yield axios.get(`/api/settings`);
    console.log('response from get all settings', response);
    yield put({ type: 'SET_ALL_SETTINGS', payload: response.data })
  } catch (error) {
    console.log('getting all settings has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* loopSpeed(action) {
  try {
    console.log('setting bot speed');
    const response = yield axios.put(`/api/settings/loopSpeed`, action.payload);
    console.log('response from loopSpeed', response);
  } catch (error) {
    console.log('setting bot speed has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}


function* settingsSaga() {
  yield takeLatest('SEND_LOOP_SPEED', loopSpeed);
  yield takeLatest('FETCH_SETTINGS', getAllSettings);
}

export default settingsSaga;
