import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';

// worker Saga: will be fired on "FETCH_USER" actions
function* fetchUser() {
  try {
    // the config includes credentials which
    // allow the server session to recognize the user
    // If a user is logged in, this will return their information
    // from the server session (req.user)
    const config = {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    };

    const response = yield axios.get('/api/user', config);

    // now that the session has given us a user object
    // with an id and username set the client-side user object to let
    // the client-side code know the user is logged in
    yield put({ type: 'SET_USER', payload: response.data });
  } catch (error) {
    console.log('User get request failed', error);
  }
}

function* fetchUsers() {
  try {
    const config = {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    };
    const response = yield axios.get('/api/user/all', config);

    console.log('the users are', response);
    yield put({ type: 'SET_ALL_USERS', payload: response.data });
  } catch (error) {
    console.log('User get request failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* deleteUser(action) {
  try {
    const config = {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
      data: action.payload
    };
    console.log('deleting user');

    const response = yield axios.delete('/api/user/', config);

    console.log('the delete user response is', response);
    if (action.payload.fromAdmin) {
      yield put({ type: 'FETCH_USERS'});
    } else {
      yield put({ type: 'UNSET_USER' });
    }
  } catch (error) {
    console.log('User get request failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* approveUser(action) {
  try {
    const config = {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
      data: action.payload
    };
    console.log('approving user');

    const response = yield axios.put('/api/user/approve', config);

    console.log('the approve user response is', response);
    yield put({ type: 'FETCH_USERS'});
  } catch (error) {
    console.log('User get request failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* userSaga() {
  yield takeLatest('FETCH_USER', fetchUser);
  yield takeLatest('FETCH_USERS', fetchUsers);
  yield takeLatest('DELETE_USER', deleteUser);
  yield takeLatest('APPROVE_USER', approveUser);
}

export default userSaga;
