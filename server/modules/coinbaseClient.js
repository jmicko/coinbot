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
      const user = await databaseClient.getUser(userID);
      const secret = user.CB_SECRET;
      const key = user.CB_ACCESS_KEY;
      const passphrase = user.CB_ACCESS_PASSPHRASE;
      const API_URI = user.API_URI;

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

async function getFees(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const user = await databaseClient.getUser(userID);
      const secret = user.CB_SECRET;
      const key = user.CB_ACCESS_KEY;
      const passphrase = user.CB_ACCESS_PASSPHRASE;
      const API_URI = user.API_URI;

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
      const user = await databaseClient.getUser(userID);
      const secret = user.CB_SECRET;
      const key = user.CB_ACCESS_KEY;
      const passphrase = user.CB_ACCESS_PASSPHRASE;
      const API_URI = user.API_URI;

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




async function getOpenOrders(userID) {
  return new Promise(async (resolve, reject) => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const user = await databaseClient.getUser(userID);
      const secret = user.CB_SECRET;
      const key = user.CB_ACCESS_KEY;
      const passphrase = user.CB_ACCESS_PASSPHRASE;
      const API_URI = user.API_URI;

      function computeSignature(request) {
        // const data      = request.data;
        const method = 'GET';
        const path = "/orders?status=open";
        const message = timestamp + method + path;
        const key = CryptoJS.enc.Base64.parse(secret);
        const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
        return hash;
      }

      const options = {
        method: 'GET',
        url: `${API_URI}/orders?status=open`,
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
      const user = await databaseClient.getUser(userID);
      const secret = user.CB_SECRET;
      const key = user.CB_ACCESS_KEY;
      const passphrase = user.CB_ACCESS_PASSPHRASE;
      const API_URI = user.API_URI;

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
      // console.log('THE DATA IS', data);
      const timestamp = Math.floor(Date.now() / 1000);
      // // sign the request
      const user = await databaseClient.getUser(data.userID);
      const secret = user.CB_SECRET;
      const key = user.CB_ACCESS_KEY;
      const passphrase = user.CB_ACCESS_PASSPHRASE;
      const API_URI = user.API_URI;

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
      const user = await databaseClient.getUser(userID);
      const secret = user.CB_SECRET;
      const key = user.CB_ACCESS_KEY;
      const passphrase = user.CB_ACCESS_PASSPHRASE;
      const API_URI = user.API_URI;

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
      const user = await databaseClient.getUser(userID);
      const secret = user.CB_SECRET;
      const key = user.CB_ACCESS_KEY;
      const passphrase = user.CB_ACCESS_PASSPHRASE;
      const API_URI = user.API_URI;

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
      console.log('cancelling all orders!!!!!!!!!!!!!');
      await cancelOrders(userID);
      let totalOrders = await getAllOrders(userID);
      console.log(totalOrders.length);
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
      console.log('checking times:', tries);
      // check if the order is in coinbase
      try {
        let cbOrder = await getOrder(order.id, userID);
        console.log('order from coinbase', cbOrder);
        resolve(true);
      } catch (err) {
        console.log('error checking coinbase for order');
        repeatedCheck(order, userID, tries);
      }
    } else { // if it has already repeated, give up
      console.log('done checking again');
      resolve(false);
    }
  });
}

module.exports = {
  getAllOrders: getAllOrders,
  getOpenOrders: getOpenOrders,
  cancelOrder: cancelOrder,
  placeOrder: placeOrder,
  getOrder: getOrder,
  cancelAllOrders: cancelAllOrders,
  getFees: getFees,
  getAccounts: getAccounts,
  repeatedCheck: repeatedCheck,
}