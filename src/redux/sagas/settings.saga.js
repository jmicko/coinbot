import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';


function* postMaxReinvestRatio(action) {
  try {
    yield axios.put(`/api/settings/postMaxReinvestRatio`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route reinvest ratio has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* reserve(action) {
  try {
    yield axios.put(`/api/settings/reserve`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route reserve has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}



function* settingsSaga() {
  yield takeLatest('POST_MAX_REINVEST_RATIO', postMaxReinvestRatio);
  yield takeLatest('SAVE_RESERVE', reserve);
}

export default settingsSaga;
