const CryptoJS = require("crypto-js");
const axios = require("axios").default;
// const crypto = require('crypto');
const cache = require("./cache");
const { v4: uuidv4 } = require('uuid');

// used for signing all requests
function signRequest(userID, data, API) {
  // get the user api details
  const userAPI = cache.getAPI(userID);
  const secret = userAPI.CB_SECRET;
  const key = userAPI.CB_ACCESS_KEY;
  const body = data ? JSON.stringify(data) : '';
  // get the timestamp
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const str = timestamp + API.method + API.path + body;
  // sign the message
  const sig = sign(str, secret);
  function sign(str, secret) {
    const hash = CryptoJS.HmacSHA256(str, secret);
    return hash.toString();
  }
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

async function getAccountsNew(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be blank
      const data = null;
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/accounts?limit=250`,
        path: "/api/v3/brokerage/accounts",
        method: 'GET',
      }
      // sign the request
      const options = signRequest(userID, data, API);

      let response = await axios.request(options);
      // console.log('SUCCESSFUL RESPONSE FROM NEW API:', response.data);
      resolve(response.data.accounts);
    } catch (err) {
      reject(err);
    }
  })
}

async function getFeesNew(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be blank
      const data = null;
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/transaction_summary?user_native_currency=USD`,
        path: "/api/v3/brokerage/transaction_summary",
        method: 'GET',
      }
      // sign the request
      const options = signRequest(userID, data, API);

      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  })
}


async function getFills(userID, params) {
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
      const options = signRequest(userID, data, API);

      if (params) {
        addParams(options, params);
      }
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
}


function addParams(options, params) {
  options.url = options.url + `?`;
  let firstParam = true;
  if (params.order_id) {
    firstParam ? firstParam = false : options.url = options.url + '&';
    options.url = options.url + `order_id=${params.order_id}`;
  }
  if (params.product_id) {
    firstParam ? firstParam = false : options.url = options.url + '&';
    options.url = options.url + `product_id=${params.product_id}`;
  }
  if (params.start_sequence_timestamp || params.start) {
    firstParam ? firstParam = false : options.url = options.url + '&';
    options.url = options.url + `start_sequence_timestamp=${params.start_sequence_timestamp || params.start}`;
  }
  if (params.end_sequence_timestamp || params.end) {
    firstParam ? firstParam = false : options.url = options.url + '&';
    options.url = options.url + `end_sequence_timestamp=${params.end_sequence_timestamp || params.end}`;
  }
  if (params.cursor) {
    firstParam ? firstParam = false : options.url = options.url + '&';
    options.url = options.url + `cursor=${params.cursor}`;
  }
  if (params.limit) {
    firstParam ? firstParam = false : options.url = options.url + '&';
    options.url = options.url + `limit=${params.limit}`;
  }
}

async function getProduct(userID, product_id) {
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
      const options = signRequest(userID, data, API);

      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
}

async function getProducts(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be blank
      const data = null;
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/products?new=TRUE`,
        path: "/api/v3/brokerage/products",
        method: 'GET',
      }
      // sign the request
      const options = signRequest(userID, data, API);

      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
}

async function getOpenOrdersNew(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be blank
      const data = null;
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/orders/historical/batch?order_status=OPEN`,
        path: "/api/v3/brokerage/orders/historical/batch",
        method: 'GET',
      }
      // sign the request
      const options = signRequest(userID, data, API);

      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
}


async function getOrderNew(userID, orderId) {
  return new Promise(async (resolve, reject) => {
    try {
      // data should just be blank
      const data = null;
      const API = {
        url: `https://coinbase.com/api/v3/brokerage/orders/historical/${orderId}`,
        path: `/api/v3/brokerage/orders/historical/${orderId}`,
        method: 'GET',
      }
      // sign the request
      const options = signRequest(userID, data, API);

      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
}



async function placeOrderNew(userID, order) {
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
      const options = signRequest(userID, data, API);

      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
      console.log('ERROR in place order function in coinbaseClient');
    }
  });
}


async function placeMarketOrder(userID, order) {
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

      const options = signRequest(userID, data, API);

      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
      console.log('ERROR in place order function in coinbaseClient');
    }
  });
}

async function cancelOrderNew(userID, orderIdArray) {
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
      const options = signRequest(userID, data, API);
      // send it
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  })
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
  getOpenOrdersNew: getOpenOrdersNew,
  placeMarketOrder: placeMarketOrder,
  cancelOrderNew: cancelOrderNew,
  getAccountsNew: getAccountsNew,
  placeOrderNew: placeOrderNew,
  getOrderNew: getOrderNew,
  getProducts: getProducts,
  getProduct: getProduct,
  getFeesNew: getFeesNew,
  getFills: getFills,
  testAPI: testAPI,
}