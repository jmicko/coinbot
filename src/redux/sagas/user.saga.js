import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';

// worker Saga: will be fired on "FETCH_USER" actions
function* fetchUser() {
  try {
    const config = {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    };

    // the config includes credentials which
    // allow the server session to recognize the user
    // If a user is logged in, this will return their information
    // from the server session (req.user)

    /* most of this code is from a previous project. Probably don't need user info on client side,
      but just commenting out for now. todo - delete later if not needed */
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

    // the config includes credentials which
    // allow the server session to recognize the user
    // If a user is logged in, this will return their information
    // from the server session (req.user)

    /* most of this code is from a previous project. Probably don't need user info on client side,
      but just commenting out for now. todo - delete later if not needed */
    const response = yield axios.get('/api/user/all', config);

    // now that the session has given us a user object
    // with an id and username set the client-side user object to let
    // the client-side code know the user is logged in
    console.log('the users are', response);
    yield put({ type: 'SET_ALL_USERS', payload: response.data });
  } catch (error) {
    console.log('User get request failed', error);
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
    // the config includes credentials which
    // allow the server session to recognize the user
    // If a user is logged in, this will return their information
    // from the server session (req.user)
    const response = yield axios.delete('/api/user/', config);
    // now that the session has given us a user object
    // with an id and username set the client-side user object to let
    // the client-side code know the user is logged in
    console.log('the delete user response is', response);
    yield put({ type: 'FETCH_USERS'});
  } catch (error) {
    console.log('User get request failed', error);
  }
}

function* userSaga() {
  yield takeLatest('FETCH_USER', fetchUser);
  yield takeLatest('FETCH_USERS', fetchUsers);
  yield takeLatest('DELETE_USER', deleteUser);
}

export default userSaga;
