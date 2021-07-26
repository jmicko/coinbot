import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';


function* fetchFees(action) {
    try {
        console.log('payload is:', action.payload);
        const response = yield axios.get(`/api/account/fees`, action.payload);
        console.log('response is.....', response.data);
        yield put({ type: 'SET_FEES', payload: response.data})
    } catch (error) {
        console.log('GET fees route has failed', error)
    }
}

function* accountSaga() {
    yield takeLatest('FETCH_FEES', fetchFees);
}

export default accountSaga;
