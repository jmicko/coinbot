const CryptoJS = require("crypto-js");
const axios = require("axios").default;
const crypto = require('crypto');
const pool = require('./pool');



async function getSecret() {
  sqlText = `SELECT * FROM "user";`;
  let result = await pool.query(sqlText);
  const secret = result.rows[0].CB_SECRET;
  // console.log('THE RESULT IS', result.rows[0]);
  // console.log('THE SECRET IS', secret);
  return secret;
}
async function getKey() {
  sqlText = `SELECT * FROM "user";`;
  let result = await pool.query(sqlText);
  const key = result.rows[0].CB_ACCESS_KEY;
  // console.log('THE KEY IS', key);
  return key;
}
async function getPassphrase() {
  sqlText = `SELECT * FROM "user";`;
  let result = await pool.query(sqlText);
  const passphrase = result.rows[0].CB_ACCESS_PASSPHRASE;
  // console.log('THE PASSPHRASE IS', passphrase);
  return passphrase;
}


async function getAllOrders() {
  return new Promise(async (resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    // // sign the request
    const secret = await getSecret();
    const key = await getKey();
    const passphrase = await getPassphrase();

    function computeSignature(request) {
      // const data      = request.data;
      const method = 'GET';
      const path = "/orders";
      const body = (method === 'GET' || !data) ? '' : JSON.stringify(data);
      const message = timestamp + method + path + body;
      const key = CryptoJS.enc.Base64.parse(secret);
      const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
      // console.log("Message: " + message + " HMAC: " + hash);

      return hash;
    }

    const options = {
      method: 'GET',
      url: 'https://api-public.sandbox.pro.coinbase.com/orders',
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
      // console.error(error);
      reject(error)
    });
  })
}




async function getOpenOrders() {
  return new Promise(async (resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    // // sign the request
    const secret = await getSecret();
    const key = await getKey();
    const passphrase = await getPassphrase();

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
      url: 'https://api-public.sandbox.pro.coinbase.com/orders?status=open',
      headers: {
        Accept: 'application/json',
        'cb-access-key': key,
        'cb-access-passphrase': passphrase,
        'cb-access-sign': computeSignature(),
        'cb-access-timestamp': timestamp
      }
    };

    axios.request(options).then(function (response) {
      // console.log(response.data.length);
      resolve(response.data);
    }).catch(function (error) {
      // console.error(error);
      reject(error);
    });
  })
}

async function getOrder(orderId) {
  return new Promise(async (resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    // // sign the request
    const secret = await getSecret();
    const key = await getKey();
    const passphrase = await getPassphrase();

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
      url: `https://api-public.sandbox.pro.coinbase.com/orders/${orderId}`,
      headers: {
        Accept: 'application/json',
        'cb-access-key': key,
        'cb-access-passphrase': passphrase,
        'cb-access-sign': computeSignature(),
        'cb-access-timestamp': timestamp
      }
    };

    axios.request(options).then(function (response) {
      resolve(response.data);
    }).catch(function (error) {
      // console.error(error);
      reject(error);
    });
  })
}

async function placeOrder(data) {
  return new Promise(async (resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    // // sign the request
    const secret = await getSecret();
    const key = await getKey();
    const passphrase = await getPassphrase();

    function computeSignature(request) {
      // const data      = request.data;
      const method = 'POST';
      const path = `/orders`;
      const body = JSON.stringify(data);
      const message = timestamp + method + path + body;
      const key = CryptoJS.enc.Base64.parse(secret);
      const hash = CryptoJS.HmacSHA256(message, key).toString(CryptoJS.enc.Base64);
      // console.log("Message: " + message + " HMAC: " + hash);

      return hash;
    }

    const options = {
      method: 'POST',
      url: `https://api-public.sandbox.pro.coinbase.com/orders`,
      headers: {
        Accept: 'application/json',
        'cb-access-key': key,
        'cb-access-passphrase': passphrase,
        'cb-access-sign': computeSignature(),
        'cb-access-timestamp': timestamp
      },
      data: data
    };

    axios.request(options).then(function (response) {
      resolve(response.data);
    }).catch(function (error) {
      // console.error(error);
      reject(error);
    });
  })
}

async function cancelOrder(orderId) {
  return new Promise(async (resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    // // sign the request
    const secret = await getSecret();
    const key = await getKey();
    const passphrase = await getPassphrase();

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
      url: `https://api-public.sandbox.pro.coinbase.com/orders/${orderId}`,
      headers: {
        Accept: 'application/json',
        'cb-access-key': key,
        'cb-access-passphrase': passphrase,
        'cb-access-sign': computeSignature(),
        'cb-access-timestamp': timestamp
      }
    };

    axios.request(options).then(function (response) {
      resolve(response.data);
    }).catch(function (error) {
      // console.error(error);
      reject(error);
    });
  })
}

async function cancelOrders() {
  return new Promise(async (resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    // // sign the request
    const secret = await getSecret();
    const key = await getKey();
    const passphrase = await getPassphrase();

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
      url: `https://api-public.sandbox.pro.coinbase.com/orders`,
      headers: {
        Accept: 'application/json',
        'cb-access-key': key,
        'cb-access-passphrase': passphrase,
        'cb-access-sign': computeSignature(),
        'cb-access-timestamp': timestamp
      }
    };

    axios.request(options).then(function (response) {
      resolve(response.data);
    }).catch(function (error) {
      // console.error(error);
      reject(error);
    });
  })
}

async function cancelAllOrders() {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('cancelling all orders!!!!!!!!!!!!!');
      await cancelOrders();
      let totalOrders = await getAllOrders();
      console.log(totalOrders.length);
      if (totalOrders.length > 0) {
        await cancelAllOrders();
      }
      resolve(true);
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = {
  getAllOrders: getAllOrders,
  getOpenOrders: getOpenOrders,
  cancelOrder: cancelOrder,
  placeOrder: placeOrder,
  getOrder: getOrder,
  cancelAllOrders: cancelAllOrders,
}