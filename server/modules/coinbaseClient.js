const CryptoJS = require("crypto-js");
const axios = require("axios").default;
const crypto = require('crypto');
const pool = require('./pool');
const databaseClient = require("./databaseClient");

function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

async function getAccounts(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const userAPI = await databaseClient.getUserAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      const passphrase = userAPI.CB_ACCESS_PASSPHRASE;
      const API_URI = userAPI.API_URI;

      function computeSignature() {
        const method = 'GET';
        const path = "/accounts";
        const message = timestamp + method + path;
        const key = CryptoJS.enc.Base64.parse(secret);
        const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
        return hash;
      }

      const options = {
        method: 'GET',
        timeout: 10000,
        url: `${API_URI}/accounts`,
        headers: {
          Accept: 'application/json',
          'cb-access-key': key,
          'cb-access-passphrase': passphrase,
          'cb-access-sign': computeSignature(),
          'cb-access-timestamp': timestamp
        }
      };

      axios.request(options).then(function (response) {
        resolve(response.data)
      }).catch(function (error) {
        reject(error)
      });
    } catch (err) {
      reject(err);
    }
  })
}

async function getFees(userID, quickAPI) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      let userAPI;
      if (quickAPI) {
        console.log('get fees can use quick api');
        userAPI = quickAPI;
      } else {
        console.log('get fees need to get api from db');
        userAPI = await databaseClient.getUserAPI(userID);
      }
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      const passphrase = userAPI.CB_ACCESS_PASSPHRASE;
      const API_URI = userAPI.API_URI;

      function computeSignature() {
        const method = 'GET';
        const path = "/fees";
        const message = timestamp + method + path;
        const key = CryptoJS.enc.Base64.parse(secret);
        const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
        return hash;
      }

      const options = {
        method: 'GET',
        timeout: 10000,
        url: `${API_URI}/fees`,
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
  })
}

async function getAllOrders(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const userAPI = await databaseClient.getUserAPI(userID);
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




async function getLimitedFills(userID, limit) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const userAPI = await databaseClient.getUserAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      const passphrase = userAPI.CB_ACCESS_PASSPHRASE;
      const API_URI = userAPI.API_URI;

      function computeSignature(request) {
        // const data      = request.data;
        const method = 'GET';
        const path = `/fills?product_id=BTC-USD&profile_id=default&limit=${limit}`;
        const message = timestamp + method + path;
        const key = CryptoJS.enc.Base64.parse(secret);
        const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
        return hash;
      }

      const options = {
        method: 'GET',
        timeout: 10000,
        url: `${API_URI}/fills?product_id=BTC-USD&profile_id=default&limit=${limit}`,
        headers: {
          Accept: 'application/json',
          'cb-access-key': key,
          'cb-access-passphrase': passphrase,
          'cb-access-sign': computeSignature(),
          'cb-access-timestamp': timestamp
        }
      };

      let response = await axios.request(options);
      // console.log('resolving getLimitedFills');
      resolve(response.data);
    } catch (err) {
      console.log(err, 'error in coinbaseClient.getLimitedFills');
      reject(err);
    }
  });
}


async function getOpenOrders(userID, quickAPI) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('quick api', quickAPI);
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      let userAPI;
      if (quickAPI) {
        console.log('can use quick api');
        userAPI = quickAPI;
      } else {
        console.log('need to get api from db');
        userAPI = await databaseClient.getUserAPI(userID);
      }
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      const passphrase = userAPI.CB_ACCESS_PASSPHRASE;
      const API_URI = userAPI.API_URI;

      function computeSignature(request) {
        // const data      = request.data;
        const method = 'GET';
        const path = "/orders?status=open&sortedBy=created_at&sorting=desc";
        const message = timestamp + method + path;
        const key = CryptoJS.enc.Base64.parse(secret);
        const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
        return hash;
      }

      const options = {
        method: 'GET',
        timeout: 10000,
        url: `${API_URI}/orders?status=open&sortedBy=created_at&sorting=desc`,
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


async function getOpenOrdersBeforeDate(userID, date) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const userAPI = await databaseClient.getUserAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      const passphrase = userAPI.CB_ACCESS_PASSPHRASE;
      const API_URI = userAPI.API_URI;

      function computeSignature(request) {
        // const data      = request.data;
        const method = 'GET';
        const path = `/orders?status=open&sortedBy=created_at&sorting=desc&end_date=${date}`;
        const message = timestamp + method + path;
        const key = CryptoJS.enc.Base64.parse(secret);
        const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
        return hash;
      }

      const options = {
        method: 'GET',
        timeout: 10000,
        url: `${API_URI}/orders?status=open&sortedBy=created_at&sorting=desc&end_date=${date}`,
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

async function getOrder(orderId, userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const userAPI = await databaseClient.getUserAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      const passphrase = userAPI.CB_ACCESS_PASSPHRASE;
      const API_URI = userAPI.API_URI;

      function computeSignature(request) {
        // const data      = request.data;
        const method = 'GET';
        const path = `/orders/${orderId}`;
        const message = timestamp + method + path;
        const key = CryptoJS.enc.Base64.parse(secret);
        const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
        return hash;
      }

      const options = {
        method: 'GET',
        timeout: 10000,
        url: `${API_URI}/orders/${orderId}`,
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

async function placeOrder(data) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const userAPI = await databaseClient.getUserAPI(data.userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      const passphrase = userAPI.CB_ACCESS_PASSPHRASE;
      const API_URI = userAPI.API_URI;

      function computeSignature(request) {
        // const data      = request.data;
        const method = 'POST';
        const path = `/orders`;
        const body = JSON.stringify(data);
        const message = timestamp + method + path + body;
        const key = CryptoJS.enc.Base64.parse(secret);
        const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
        return hash;
      }

      const options = {
        method: 'POST',
        timeout: 10000,
        url: `${API_URI}/orders`,
        headers: {
          Accept: 'application/json',
          'cb-access-key': key,
          'cb-access-passphrase': passphrase,
          'cb-access-sign': computeSignature(),
          'cb-access-timestamp': timestamp
        },
        data: data
      };
      let response = await axios.request(options);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
}

async function cancelOrder(orderId, userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const userAPI = await databaseClient.getUserAPI(userID);
      const secret = userAPI.CB_SECRET;
      const key = userAPI.CB_ACCESS_KEY;
      const passphrase = userAPI.CB_ACCESS_PASSPHRASE;
      const API_URI = userAPI.API_URI;

      function computeSignature(request) {
        // const data      = request.data;
        const method = 'DELETE';
        const path = `/orders/${orderId}`;
        const message = timestamp + method + path;
        const key = CryptoJS.enc.Base64.parse(secret);
        const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
        return hash;
      }
      const options = {
        method: 'DELETE',
        timeout: 10000,
        url: `${API_URI}/orders/${orderId}`,
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
  })
}

async function cancelOrders(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const userAPI = await databaseClient.getUserAPI(userID);
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

async function cancelAllOrders(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      await cancelOrders(userID);
      let totalOrders = await getAllOrders(userID);
      if (totalOrders.length > 0) {
        await cancelAllOrders(userID);
      }
      resolve(true);
    } catch (err) {
      reject(err)
    }
  })
}

async function repeatedCheck(order, userID, tries) {
  return new Promise(async (resolve, reject) => {
    // repeats 10 times
    if (tries < 10) {
      await sleep(tries * 100)
      tries++;
      // check if the order is in coinbase
      try {
        let cbOrder = await getOrder(order.id, userID);
        resolve(true);
      } catch (err) {
        // console.log('error checking coinbase for order');
        repeatedCheck(order, userID, tries);
      }
    } else { // if it has already repeated, give up
      resolve(false);
    }
  });
}

async function testAPI(secret, key, passphrase, API_URI) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);

      // sign the request
      function computeSignature() {
        const method = 'GET';
        const path = "/fees";
        const message = timestamp + method + path;
        const key = CryptoJS.enc.Base64.parse(secret);
        const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
        return hash;
      }

      const options = {
        method: 'GET',
        timeout: 10000,
        url: `${API_URI}/fees`,
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
  })
}

module.exports = {
  getAllOrders: getAllOrders,
  getLimitedFills: getLimitedFills,
  getOpenOrders: getOpenOrders,
  cancelOrder: cancelOrder,
  placeOrder: placeOrder,
  getOrder: getOrder,
  cancelAllOrders: cancelAllOrders,
  getFees: getFees,
  getAccounts: getAccounts,
  repeatedCheck: repeatedCheck,
  testAPI: testAPI,
  getOpenOrdersBeforeDate: getOpenOrdersBeforeDate,
}