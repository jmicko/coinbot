import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';


function* testSagaFile(action) {
    try {
        //   const response = yield axios.get('/api/');
        //   console.log('back from server', response.data.rows);

        // now that the session has ended on the server
        // remove the client-side user object to let
        // the client-side code know the user is logged out
        yield put({ type: 'RETURN_TEST_3', payload: 'payload from saga file' });
    } catch (error) {
        console.log('Feedback get request failed', error);
    }
}

function* testServerFile(action) {
    try {
        console.log('in the test server saga function');
        // yield axios.get('/api/test/');
        const response = yield axios.get('/api/test');
        console.log('back from server', response);

        // now that the session has ended on the server
        // remove the client-side user object to let
        // the client-side code know the user is logged out
        yield put({ type: 'RETURN_TEST_3', payload: response });
    } catch (error) {
        console.log('Feedback get request failed', error);
    }
}

function* testSaga() {
    yield takeLatest('TEST_SAGA', testSagaFile);
    yield takeLatest('TEST_SERVER', testServerFile);
}

export default testSaga;
