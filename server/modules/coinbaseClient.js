const CryptoJS = require("crypto-js");
const axios = require("axios").default;
// const crypto = require('crypto');
const cache = require("./cache");
const { v4: uuidv4 } = require('uuid');


async function getAccountsNew(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const userAPI = cache.getAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      // const API_URI = userAPI.API_URI;


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
        url: `https://coinbase.com/api/v3/brokerage/accounts?limit=250`,
        headers: {
          Accept: 'application/json',
          'cb-access-key': key,
          'cb-access-sign': sig,
          'cb-access-timestamp': timestamp
        }
      };

      // console.log('getting accounts');

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
      const userAPI = cache.getAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      // const API_URI = userAPI.API_URI;


      const method = 'GET';
      const path = "/api/v3/brokerage/transaction_summary";
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
        url: `https://coinbase.com/api/v3/brokerage/transaction_summary?user_native_currency=USD`,
        headers: {
          Accept: 'application/json',
          'CB-ACCESS-KEY': key,
          'CB-ACCESS-SIGN': sig,
          'CB-ACCESS-TIMESTAMP': timestamp
        }
      };
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  })
}

async function getAllOrders(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const userAPI = cache.getAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      const passphrase = userAPI.CB_ACCESS_PASSPHRASE;
      const API_URI = userAPI.API_URI;

      function computeSignature(request) {
        // const data      = request.data;
        const method = 'GET';
        const path = "/orders";
        const body = (method === 'GET' || !data) ? '' : JSON.stringify(data);
        const message = timestamp + method + path + body;
        const key = CryptoJS.enc.Base64.parse(secret);
        const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
        return hash;
      }
      const options = {
        method: 'GET',
        timeout: 10000,
        url: `${API_URI}/orders`,
        headers: {
          Accept: 'application/json',
          'cb-access-key': key,
          'cb-access-passphrase': passphrase,
          'cb-access-sign': computeSignature(),
          'cb-access-timestamp': timestamp
        }
      };

      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err)
    }
  });
}


async function getFills(userID, params) {
  return new Promise(async (resolve, reject) => {
    try {
      const userAPI = cache.getAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;

      const method = 'GET';
      const path = "/api/v3/brokerage/orders/historical/fills";
      const body = "";

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
        url: `https://coinbase.com/api/v3/brokerage/orders/historical/fills`,
        headers: {
          Accept: 'application/json',
          'CB-ACCESS-KEY': key,
          'CB-ACCESS-SIGN': sig,
          'CB-ACCESS-TIMESTAMP': timestamp
        }
      };

      if (params) {
        options.url = options.url + `?`
        let firstParam = true;
        if (params.order_id) {
          firstParam ? firstParam = false : options.url = options.url + '&'
          options.url = options.url + `order_id=${params.order_id}`;
        }
        if (params.product_id) {
          firstParam ? firstParam = false : options.url = options.url + '&'
          options.url = options.url + `product_id=${params.product_id}`;
        }
        if (params.start_sequence_timestamp || params.start) {
          firstParam ? firstParam = false : options.url = options.url + '&'
          options.url = options.url + `start_sequence_timestamp=${params.start_sequence_timestamp || params.start}`;
        }
        if (params.end_sequence_timestamp || params.end) {
          firstParam ? firstParam = false : options.url = options.url + '&'
          options.url = options.url + `end_sequence_timestamp=${params.end_sequence_timestamp || params.end}`;
        }
        if (params.cursor) {
          firstParam ? firstParam = false : options.url = options.url + '&'
          options.url = options.url + `cursor=${params.cursor}`;
        }
        if (params.limit) {
          firstParam ? firstParam = false : options.url = options.url + '&'
          options.url = options.url + `limit=${params.limit}`;
        }
      }
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
      const userAPI = cache.getAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      const method = 'GET';
      const path = "/api/v3/brokerage/products";
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
        url: `https://coinbase.com/api/v3/brokerage/products?new=TRUE`,
        headers: {
          Accept: 'application/json',
          'cb-access-key': key,
          'cb-access-sign': sig,
          'cb-access-timestamp': timestamp
        }
      };

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
      const userAPI = cache.getAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      // const API_URI = userAPI.API_URI;


      const method = 'GET';
      const path = "/api/v3/brokerage/orders/historical/batch";
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
        url: `https://coinbase.com/api/v3/brokerage/orders/historical/batch?order_status=OPEN`,
        headers: {
          Accept: 'application/json',
          'cb-access-key': key,
          'cb-access-sign': sig,
          'cb-access-timestamp': timestamp
        }
      };

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
      const userAPI = cache.getAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      // const API_URI = userAPI.API_URI;


      const method = 'GET';
      const path = `/api/v3/brokerage/orders/historical/${orderId}`;
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
        url: `https://coinbase.com/api/v3/brokerage/orders/historical/${orderId}`,
        headers: {
          Accept: 'application/json',
          'cb-access-key': key,
          'cb-access-sign': sig,
          'cb-access-timestamp': timestamp
        }
      };
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


      const userAPI = cache.getAPI(userID);
      // console.log(userAPI, 'user api');
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;

      const method = 'POST';
      const path = "/api/v3/brokerage/orders";
      const body = JSON.stringify(data);

      // const CryptoJS = require('crypto-js');
      function sign(str, apiSecret) {
        const hash = CryptoJS.HmacSHA256(str, apiSecret);
        return hash.toString();
      }
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const str = timestamp + method + path + body
      const sig = sign(str, secret)

      const options = {
        method: 'POST',
        timeout: 10000,
        url: `https://coinbase.com/api/v3/brokerage/orders`,
        headers: {
          Accept: 'application/json',
          'cb-access-key': key,
          'cb-access-sign': sig,
          'cb-access-timestamp': timestamp
        },
        data: data
      };
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


      const userAPI = cache.getAPI(userID);
      // console.log(userAPI, 'user api');
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;

      const method = 'POST';
      const path = "/api/v3/brokerage/orders";
      const body = JSON.stringify(data);

      // const CryptoJS = require('crypto-js');
      function sign(str, apiSecret) {
        const hash = CryptoJS.HmacSHA256(str, apiSecret);
        return hash.toString();
      }
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const str = timestamp + method + path + body
      const sig = sign(str, secret)

      const options = {
        method: 'POST',
        timeout: 10000,
        url: `https://coinbase.com/api/v3/brokerage/orders`,
        headers: {
          Accept: 'application/json',
          'cb-access-key': key,
          'cb-access-sign': sig,
          'cb-access-timestamp': timestamp
        },
        data: data
      };
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

      const data = { order_ids: orderIdArray }

      const userAPI = cache.getAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      // const API_URI = userAPI.API_URI;


      const method = 'POST';
      const path = "/api/v3/brokerage/orders/batch_cancel";
      const body = JSON.stringify(data);

      // const CryptoJS = require('crypto-js');
      function sign(str, apiSecret) {
        const hash = CryptoJS.HmacSHA256(str, apiSecret);
        return hash.toString();
      }
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const str = timestamp + method + path + body
      const sig = sign(str, secret)


      const options = {
        method: 'POST',
        timeout: 10000,
        url: `https://coinbase.com/api/v3/brokerage/orders/batch_cancel`,
        headers: {
          Accept: 'application/json',
          'cb-access-key': key,
          'cb-access-sign': sig,
          'cb-access-timestamp': timestamp
        },
        data: data
      };

      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  })
}


async function cancelOrders(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const userAPI = cache.getAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      const passphrase = userAPI.CB_ACCESS_PASSPHRASE;
      const API_URI = userAPI.API_URI;

      function computeSignature(request) {
        // const data      = request.data;
        const method = 'DELETE';
        const path = `/orders`;
        const message = timestamp + method + path;
        const key = CryptoJS.enc.Base64.parse(secret);
        const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
        return hash;
      }
      const options = {
        method: 'DELETE',
        timeout: 10000,
        url: `${API_URI}/orders`,
        headers: {
          Accept: 'application/json',
          'cb-access-key': key,
          'cb-access-passphrase': passphrase,
          'cb-access-sign': computeSignature(),
          'cb-access-timestamp': timestamp
        }
      };

      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
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
  getOpenOrdersNew: getOpenOrdersNew,
  placeMarketOrder: placeMarketOrder,
  cancelOrderNew: cancelOrderNew,
  getAccountsNew: getAccountsNew,
  placeOrderNew: placeOrderNew,
  getOrderNew: getOrderNew,
  getProducts: getProducts,
  getFeesNew: getFeesNew,
  getFills: getFills,
  testAPI: testAPI,
}