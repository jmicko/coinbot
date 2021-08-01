import { all } from 'redux-saga/effects';
import tradeSaga from './trade.saga';
import accountSaga from './account.saga';
import orderSaga from './order.saga';
import userSaga from './user.saga';
import loginSaga from './login.saga';

// rootSaga is the primary saga.
// It bundles up all of the other sagas so our project can use them.
// This is imported in index.js as rootSaga

// some sagas trigger other sagas, as an example
// the registration triggers a login
// and login triggers setting the user
export default function* rootSaga() {
  yield all([
      tradeSaga(),
      accountSaga(),
      orderSaga(),
      userSaga(),
      loginSaga(),
  ]);
}
