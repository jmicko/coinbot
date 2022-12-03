const CryptoJS = require("crypto-js");
const axios = require("axios").default;
// const { cache } = require("./cache");
const { v4: uuidv4 } = require('uuid');

class Coinbase {
  constructor(key, secret) {
    this.key = key;
    this.secret = secret;
  }
  // used for signing all requests
  signRequest(data, API) {
    // convert the data to JSON, if any
    const body = data ? JSON.stringify(data) : '';
    // get the timestamp
    const timestamp = Math.floor(Date.now() / 1000).toString();
    // build the message string
    const message = timestamp + API.method + API.path + body;
    // sign the message
    const sig = CryptoJS.HmacSHA256(message, this.secret).toString();
    // build the options object to return to the requester function
    const options = {
      method: API.method,
      timeout: 10000,
      url: API.url,
      headers: {
        Accept: 'application/json',
        'cb-access-key': this.key,
        'cb-access-sign': sig,
        'cb-access-timestamp': timestamp
      },
      data: data
    };
    return options;
  }
  addParams(options, params) {
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

  // CALL IT LIKE THIS coinbase.getAccounts({ limit: 250, someKey:whateverValue })
  async getAccounts(params) {
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
        const options = this.signRequest(data, API);
        // add params, if any
        if (params) { this.addParams(options, params) };
        // make the call
        let response = await axios.request(options);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    })
  }

  async getFills(params) {
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
        const options = this.signRequest(data, API);
        // add params, if any
        if (params) { this.addParams(options, params) };
        // make the call
        let response = await axios.request(options);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getOrders(params) {
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
        const options = this.signRequest(data, API);
        // add params, if any
        if (params) { this.addParams(options, params) };
        // make the call
        let response = await axios.request(options);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    });
  }
  async getTransactionSummary(params) {
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
        const options = this.signRequest(data, API);
        // add params, if any
        if (params) { this.addParams(options, params) };
        // make the call
        let response = await axios.request(options);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    })
  }


  // DO NOT pass a params object to some get requests
  async getProduct(product_id) {
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
        const options = this.signRequest(data, API);
        // make the call
        let response = await axios.request(options);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    });
  }


  async getProducts(params) {
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
        const options = this.signRequest(data, API);
        // add params, if any
        if (params) { this.addParams(options, params) };
        // make the call
        let response = await axios.request(options);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    });
  }


  // docs say params are deprecated, so just an order_id is needed for now
  async getOrder(order_id) {
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
        const options = this.signRequest(data, API);
        // make the call
        let response = await axios.request(options);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    });
  }



  async placeOrder(order) {
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
        const options = this.signRequest(data, API);
        // make the call
        let response = await axios.request(options);
        resolve(response.data);
      } catch (err) {
        reject(err);
        console.log('ERROR in place order function');
      }
    });
  }


  async placeMarketOrder(order) {
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
        const options = this.signRequest(data, API);
        // make the call
        let response = await axios.request(options);
        resolve(response.data);
      } catch (err) {
        reject(err);
        console.log('ERROR in place order function');
      }
    });
  }

  async cancelOrders(orderIdArray) {
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
        const options = this.signRequest(data, API);
        // make the call
        let response = await axios.request(options);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    })
  }

  async cancelAll() {
    return new Promise(async (resolve, reject) => {
      try {
        const openOrders = await this.getOrders({ order_status: 'OPEN', limit: 1000 });
        const idArray = [];
        openOrders.orders.forEach(order => {
          idArray.push(order.order_id)
        });
        const cancelResult = await this.cancelOrders(idArray);
        let result = [
          { openOrdersResult: openOrders },
          { cancelResult: cancelResult }
        ]
        // let's get recursive! call the function again if there are 1000 returned orders. Might be more
        if (openOrders?.orders.length >= 1000) {
          const nextResult = await cancelAll()
          result = result.concat(nextResult);
        }
        resolve(result)
      } catch (err) {
        reject(err)
      }
    });
  }
}


module.exports = {Coinbase};