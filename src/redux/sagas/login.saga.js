import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';

// worker Saga: will be fired on "LOGIN" actions
function* loginUser(action) {
  try {
    /* most of this code is from a previous project. Don't need errors showing on dom for now. 
    todo - delete later if not needed or use */

    // clear any existing error on the login page
    // yield put({ type: 'CLEAR_LOGIN_ERROR' });

    const config = {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    };

    // send the action.payload as the body
    // the config includes credentials which
    // allow the server session to recognize the user
    yield axios.post('/api/user/login', action.payload, config);

    // after the user has logged in
    // get the user information from the server
        /* most of this code is from a previous project. Probably don't need user info on client side,
      but just commenting out for now. todo - delete later if not needed */
    // yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('Error with user login:', error);
    if (error.response.status === 401) {
      // The 401 is the error status sent from passport
      // if user isn't in the database or
      // if the email and password don't match in the database
      /* most of this code is from a previous project. Don't need errors showing on dom for now. 
        todo - delete later if not needed or use */
      // yield put({ type: 'LOGIN_FAILED' });
      console.log('login failed');
    } else {
      console.log('login failed, not 401');
      // Got an error that wasn't a 401
      // Could be anything, but most common cause is the server is not started
      /* most of this code is from a previous project. Don't need errors showing on dom for now. 
        todo - delete later if not needed or use */
      // yield put({ type: 'LOGIN_FAILED_NO_CODE' });
    }
  }
}

// worker Saga: will be fired on "REGISTER" actions
function* registerUser(action) {
  try {
    // clear any existing error on the registration page
    // yield put({ type: 'CLEAR_REGISTRATION_ERROR' });
    console.log('in register saga');

    // passes the username and password from the payload to the server
    yield axios.post('/api/user/register', action.payload);

    // automatically log a user in after registration
    yield put({ type: 'LOGIN', payload: action.payload });

    // set to 'login' mode so they see the login screen
    // after registration or after they log out
    yield put({ type: 'SET_TO_LOGIN_MODE' });
  } catch (error) {
    console.log('Error with user registration:', error);
    yield put({ type: 'REGISTRATION_FAILED' });
  }
}

// worker Saga: will be fired on "LOGOUT" actions
function* logoutUser(action) {
  try {
    const config = {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    };

    // the config includes credentials which
    // allow the server session to recognize the user
    // when the server recognizes the user session
    // it will end the session
    yield axios.post('/api/user/logout', config);

    // now that the session has ended on the server
    // remove the client-side user object to let
    // the client-side code know the user is logged out
    yield put({ type: 'UNSET_USER' });
  } catch (error) {
    console.log('Error with user logout:', error);
  }
}

function* loginSaga() {
  yield takeLatest('LOGIN', loginUser);
  yield takeLatest('REGISTER', registerUser);
  yield takeLatest('LOGOUT', logoutUser);
}

export default loginSaga;