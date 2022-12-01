const CryptoJS = require("crypto-js");
const axios = require("axios").default;
const cache = require("./cache");
const { v4: uuidv4 } = require('uuid');


// used for signing all requests
function signRequest(user_api, data, API) {
  // get the user api details
  const userAPI = cache.getAPI(user_api);
  const secret = userAPI.CB_SECRET;
  const key = userAPI.CB_ACCESS_KEY;
  // const secret = user_api.CB_SECRET;
  // const key = user_api.CB_ACCESS_KEY;
  // convert the data to JSON, if any
  const body = data ? JSON.stringify(data) : '';
  // get the timestamp
  const timestamp = Math.floor(Date.now() / 1000).toString();
  // build the message string
  const message = timestamp + API.method + API.path + body;
  // sign the message
  const sig = CryptoJS.HmacSHA256(message, secret).toString();
  // build the options object to return to the requester function
  const options = {
    method: API.method,
    timeout: 10000,
    url: API.url,
    headers: {
      Accept: 'application/json',
      'cb-access-key': key,
      'cb-access-sign': sig,
      'cb-access-timestamp': timestamp
    },
    data: data
  };
  return options;
}

function addParams(options, params) {
  // this function is only called if there are params, so add a ? to the url string
  options.url = options.url + `?`;
  // Iterate over each object key/value pair, adding them to the url
  Object.keys(params).forEach(key => {
    // add new param
    options.url += `${key}=${params[key]}&`;
  });
  // cut off the last & symbol
  options.url.slice(0, -1)
}

// CALL IT LIKE THIS coinbaseClient.getAccounts(user_api, { limit: 250 })
async function getAccounts(user_api, params) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be blank
      const data = null;
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/accounts`,
        path: "/api/v3/brokerage/accounts",
        method: 'GET',
      }
      // sign the request
      const options = signRequest(user_api, data, API);
      // add params, if any
      if (params) { addParams(options, params) };
      // make the call
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  })
}

async function getTransactionSummary(user_api, params) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be blank
      const data = null;
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/transaction_summary`,
        path: "/api/v3/brokerage/transaction_summary",
        method: 'GET',
      }
      // sign the request
      const options = signRequest(user_api, data, API);
      // add params, if any
      if (params) { addParams(options, params) };
      // make the call
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  })
}


async function getFills(user_api, params) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be blank
      const data = null;
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/orders/historical/fills`,
        path: "/api/v3/brokerage/orders/historical/fills",
        method: 'GET',
      }
      // sign the request
      const options = signRequest(user_api, data, API);
      // add params, if any
      if (params) { addParams(options, params) };
      // make the call
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
}

// DO NOT pass a params object to some get requests
async function getProduct(user_api, product_id) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be blank
      const data = null;
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/products/${product_id}`,
        path: `/api/v3/brokerage/products/${product_id}`,
        method: 'GET',
      }
      // sign the request
      const options = signRequest(user_api, data, API);
      // make the call
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
}

async function getProducts(user_api, params) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be blank
      const data = null;
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/products`,
        path: "/api/v3/brokerage/products",
        method: 'GET',
      }
      // sign the request
      const options = signRequest(user_api, data, API);
      // add params, if any
      if (params) { addParams(options, params) };
      // make the call
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
}

async function getOrders(user_api, params) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be blank
      const data = null;
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/orders/historical/batch`,
        path: "/api/v3/brokerage/orders/historical/batch",
        method: 'GET',
      }
      // sign the request
      const options = signRequest(user_api, data, API);
      // add params, if any
      if (params) { addParams(options, params) };
      // make the call
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
}

// docs say params are deprecated, so just an order_id is needed for now
async function getOrder(user_api, order_id) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be blank
      const data = null;
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/orders/historical/${order_id}`,
        path: `/api/v3/brokerage/orders/historical/${order_id}`,
        method: 'GET',
      }
      // sign the request
      const options = signRequest(user_api, data, API);
      // make the call
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
}



async function placeOrder(user_api, order) {
  return new Promise(async (resolve, reject) => {
    try {
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/orders`,
        path: "/api/v3/brokerage/orders",
        method: 'POST',
      }
      const data = {
        side: order.side,
        order_configuration: {
          limit_limit_gtc: {
            base_size: order.base_size,
            limit_price: order.limit_price,
            // post_only: false
          },
        },
        product_id: order.product_id,
        client_order_id: order.client_order_id || uuidv4()
      }
      // sign the request
      const options = signRequest(user_api, data, API);
      // make the call
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
      console.log('ERROR in place order function in coinbaseClient');
    }
  });
}


async function placeMarketOrder(user_api, order) {
  return new Promise(async (resolve, reject) => {
    try {

      const API = {
        url: `https://coinbase.com/api/v3/brokerage/orders`,
        path: "/api/v3/brokerage/orders",
        method: 'POST',
      }

      const data = {
        side: order.side,
        order_configuration: {
          limit_limit_gtc: {
            base_size: order.base_size,
            limit_price: (order.side === 'BUY')
              ? (order.tradingPrice * 2).toString()
              : (order.tradingPrice / 2).toString()
            // post_only: false
          },
          // market_market_ioc: {
          //   // quote_size: '10.00',
          //   base_size: order.base_size
          // },
          // stop_limit_stop_limit_gtc: { stop_direction: 'UNKNOWN_STOP_DIRECTION' },
          // stop_limit_stop_limit_gtd: { stop_direction: 'UNKNOWN_STOP_DIRECTION' }
        },
        product_id: order.product_id,
        client_order_id: order.client_order_id || uuidv4()
      }

      // sign the request
      const options = signRequest(user_api, data, API);
      // make the call
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
      console.log('ERROR in place order function in coinbaseClient');
    }
  });
}

async function cancelOrders(user_api, orderIdArray) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be an array of IDs
      const data = { order_ids: orderIdArray }
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/orders/batch_cancel`,
        path: "/api/v3/brokerage/orders/batch_cancel",
        method: 'POST',
      }
      // sign the request
      const options = signRequest(user_api, data, API);
      // make the call
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  })
}

async function cancelAll(user_api) {
  return new Promise(async (resolve, reject) => {
    try {
      const openOrders = await getOrders(user_api, { order_status: 'OPEN', limit: 1000 });
      const idArray = [];
      openOrders.orders.forEach(order => {
        idArray.push(order.order_id)
      });
      const cancelResult = await cancelOrders(user_api, idArray);
      let result = [
        { openOrdersResult: openOrders },
        { cancelResult: cancelResult }
      ]
      // let's get recursive! call the function again if there are 1000 returned orders. Might be more
      if (openOrders?.orders.length >= 1000) {
        const nextResult = await cancelAll(user_api)
        result = result.concat(nextResult);
      }
      resolve(result)
    } catch (err) {
      reject(err)
    }
  });
}


async function testAPI(secret, key) {
  return new Promise(async (resolve, reject) => {
    try {
      // const timestamp = Math.floor(Date.now() / 1000);

      const method = 'GET';
      const path = "/api/v3/brokerage/accounts";
      const body = "";




      // const CryptoJS = require('crypto-js');
      function sign(str, apiSecret) {
        const hash = CryptoJS.HmacSHA256(str, apiSecret);
        return hash.toString();
      }
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const str = timestamp + method + path + body
      const sig = sign(str, secret)


      const options = {
        method: 'GET',
        timeout: 10000,
        url: 'https://coinbase.com/api/v3/brokerage/accounts',
        headers: {
          Accept: 'application/json',
          'CB-ACCESS-KEY': key,
          'CB-ACCESS-SIGN': sig,
          'CB-ACCESS-TIMESTAMP': timestamp
        }
      };
      let response = await axios.request(options);
      console.log('SUCCESSFUL RESPONSE FROM NEW API:');
      resolve(response.data);
    } catch (err) {
      console.log(err, 'unsuccessful call to new api');
      reject(err);
    }
  })
}

module.exports = {
  placeMarketOrder: placeMarketOrder,
  getOrders: getOrders,
  cancelOrders: cancelOrders,
  getAccounts: getAccounts,
  getProducts: getProducts,
  placeOrder: placeOrder,
  getProduct: getProduct,
  cancelAll: cancelAll,
  getFills: getFills,
  getOrder: getOrder,
  getTransactionSummary: getTransactionSummary,
  testAPI: testAPI,
}