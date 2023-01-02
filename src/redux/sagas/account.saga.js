import { put, takeLatest } from 'redux-saga/effects';
import axios from 'axios';



function* fetchProfits(action) {
  try {
    // send the product id as a query parameter
    const response = yield axios.get(`/api/account/profits/${action.payload.product}`);
    yield put({ type: 'SET_PROFITS', payload: response.data })
  } catch (error) {
    // console.log('GET profits route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

// get all products
function* fetchProducts() {
  try {
    const response = yield axios.get(`/api/account/products`);
    yield put({ type: 'SET_PRODUCTS', payload: response.data })
    // console.log(response.data);
  } catch (error) {
    // console.log('GET products route has failed', error);
    if (error?.response?.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

// toggle active status of product
function* toggleActiveProduct(action) {
  try {
    yield axios.put(`/api/account/products`, action.payload);
    yield put({ type: 'FETCH_PRODUCTS' });
  } catch (error) {
    // console.log('PUT products route has failed', error);
    if (error?.response?.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}
  

function* fetchErrors() {
  try {
    const response = yield axios.get(`/api/account/errors`);
    yield put({ type: 'SET_BOT_ERRORS', payload: response.data })
    // console.log(response.data);
  } catch (error) {
    // console.log('GET profits route has failed', error);
    if (error?.response?.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* fetchMessages() {
  try {
    const response = yield axios.get(`/api/account/messages`);
    yield put({ type: 'SET_BOT_MESSAGES', payload: response.data.general })
    yield put({ type: 'SET_CHAT_MESSAGES', payload: response.data.chat })
    // console.log(response.data);
  } catch (error) {
    // console.log('GET profits route has failed', error);
    if (error?.response?.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* storeApi(action) {
  try {
    yield axios.post(`/api/account/storeApi`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    // console.log('post account route storeApi has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
    if (error.response.status === 500) {
      yield put({ type: 'REGISTRATION_FAILED' });
    }
  }
}

function* resetProfit(action) {
  try {
    yield axios.post(`/api/account/resetProfit`);
    yield put({ type: 'FETCH_PROFITS', payload: action.payload });
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    // console.log('put account route resetProfit has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* pause(action) {
  try {
    yield axios.put(`/api/account/pause`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route pause has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* setTheme(action) {
  try {
    yield axios.put(`/api/account/theme`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route reinvest ratio has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* reinvest(action) {
  try {
    yield axios.put(`/api/account/reinvest`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route reinvest has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* reinvestRatio(action) {
  try {
    yield axios.put(`/api/account/reinvestRatio`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route reinvest ratio has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* tradeMax(action) {
  try {
    yield axios.put(`/api/account/tradeMax`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route reinvest has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* storeMaxTradeSize(action) {
  try {
    yield axios.put(`/api/account/maxTradeSize`, action.payload);
    yield put({ type: 'FETCH_USER' });
  } catch (error) {
    console.log('put account route reinvest ratio has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

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

// export candles for a product and granularity
function* exportCandles(action) {
  try {
    const response = yield axios.get(`/api/account/exportCandles/${action.payload.product}/${action.payload.granularity}`, { responseType: 'arraybuffer' });
    // save the file to the client
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `${action.payload.product}-${action.payload.granularity}.xlsx`;
    link.click();
    // yield put({ type: 'SET_CANDLES', payload: response })
  } catch (error) {
    console.log('export candles route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* exportCurrentJSON() {
  try {
    const response = yield axios.get(`/api/account/exportCurrentJSON`);
    yield put({ type: 'SET_CURRENT_JSON', payload: response.data })
  } catch (error) {
    console.log('get current JSON route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}


function* importCurrentJSON(action) {
  try {
    yield axios.post(`/api/account/importCurrentJSON`, action.payload);
  } catch (error) {
    console.log('importCurrentJSON route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* debug(action) {
  try {
    const response = yield axios.get(`/api/account/debug`, {params:{ id: action.payload.id}});
    yield put({ type: 'SET_DEBUG', payload: response.data })
  } catch (error) {
    console.log('debug route has failed', error);
    if (error.response.status === 403) {
      yield put({ type: 'UNSET_USER' });
    }
  }
}

function* accountSaga() {
  yield takeLatest('FETCH_PROFITS', fetchProfits);
  yield takeLatest('FETCH_PRODUCTS', fetchProducts);
  yield takeLatest('TOGGLE_ACTIVE_PRODUCT', toggleActiveProduct);
  yield takeLatest('FETCH_BOT_ERRORS', fetchErrors);
  yield takeLatest('FETCH_BOT_MESSAGES', fetchMessages);
  yield takeLatest('STORE_API', storeApi);
  yield takeLatest('RESET_PROFIT', resetProfit);
  yield takeLatest('PAUSE', pause);
  yield takeLatest('SET_THEME', setTheme);
  yield takeLatest('REINVEST', reinvest);
  yield takeLatest('REINVEST_RATIO', reinvestRatio);
  yield takeLatest('TOGGLE_TRADE_MAX', tradeMax);
  yield takeLatest('STORE_MAX_TRADE_SIZE', storeMaxTradeSize);
  yield takeLatest('EXPORT_XLSX', exportXlsx);
  yield takeLatest('EXPORT_CANDLE_XLSX', exportCandles);
  yield takeLatest('EXPORT_CURRENT_JSON', exportCurrentJSON);
  yield takeLatest('IMPORT_CURRENT_JSON', importCurrentJSON);
  yield takeLatest('DEBUG', debug);
}

export default accountSaga;
