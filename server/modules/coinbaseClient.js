const CryptoJS = require("crypto-js");
const axios = require("axios").default;
// const { cache } = require("./cache");
const { v4: uuidv4 } = require('uuid');

class Coinbase {
  constructor(key, secret) {
    if (!secret?.length || !key?.length) {
      throw new Error('Coinbase is missing mandatory key and/or secret!');
    }
    this.key = key;
    this.secret = secret;
    this.WS_API_URL = 'wss://advanced-trade-ws.coinbase.com';
    // console.log(this,'new coinbase class thing');
  }
  // used for signing all SOCKET requests
  timestampAndSignSocket(message, channel, products = []) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const strToSign = `${timestamp}${channel}${products.join(',')}`;
    const sig = CryptoJS.HmacSHA256(strToSign, secret).toString();
    return { ...message, signature: sig, timestamp: timestamp };
  }
  subscribe(products, channelName, ws) {
    // console.log('products: %s', products.join(','));
    const message = {
      type: 'subscribe',
      channel: channelName,
      api_key: this.key,
      product_ids: products,
      user_id: '',
    };
    const subscribeMsg = timestampAndSignSocket(message, channelName, products);
    ws.send(JSON.stringify(subscribeMsg));
  }
  unsubscribe(products, channelName, ws) {
    const message = {
      type: 'unsubscribe',
      channel: channelName,
      api_key: this.key,
      product_ids: products,
    };
    const subscribeMsg = this.timestampAndSignSocket(message, channelName, products);
    ws.send(JSON.stringify(subscribeMsg));
  }
  openSocket() {
    this.ws = new WebSocket(WS_API_URL);



    this.ws.on('error', (error) => {
      console.log(error, 'error on ws connection');
    });
    this.ws.on('open', timer);
    // ws.on('open', ordersInterval);
    this.ws.on('message', timer);
    this.ws.on('close', function clear() {
      clearTimeout(this.pingTimeout);
      // clearInterval(this.getOrders)
    });

  }

  // used for signing all REST requests
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
        console.log(order, 'incoming order');
        // build out the order config
        const orderConfig =
          order.order_configuration
            ?// did the user provide their own order config?
            order.order_configuration // use the user provided config
            : //if they provided a flat object...
            order.limit_price
              ? // is there a limit price?,
              order.end_time //end times will only be provided on gtd orders
                ?// Is it good-till-date?
                {
                  limit_limit_gtd: {
                    // it will have either a base or quote size
                    ...this.base_size = order.base_size && { base_size: order.base_size },
                    ...this.quote_size = order.quote_size && { quote_size: order.quote_size },
                    limit_price: order.limit_price,
                    post_only: order.post_only || false,
                    end_time: order.end_time
                  }
                }
                : // Is it good till cancel? ->no end_time property
                {
                  limit_limit_gtc: {
                    ...this.base_size = order.base_size && { base_size: order.base_size },
                    ...this.quote_size = order.quote_size && { quote_size: order.quote_size },
                    limit_price: order.limit_price,
                    post_only: order.post_only || false
                  }
                }
              : // if there is no limit price...
              order.stop_price // is there a stop price? It will be a STOP LIMIT, either good till date or good till cancel
                ? order.end_time //end times will only be provided on gtd orders
                  ? // Is it good-till-date?
                  {
                    stop_limit_stop_limit_gtd: {
                      ...this.base_size = order.base_size && { base_size: order.base_size },
                      ...this.quote_size = order.quote_size && { quote_size: order.quote_size },
                      limit_price: order.limit_price,
                      post_only: order.post_only || false,
                      end_time: order.end_time
                    }
                  }
                  : // Is it good till cancel? ->no end_time property
                  {
                    stop_limit_stop_limit_gtc: {
                      ...this.base_size = order.base_size && { base_size: order.base_size },
                      ...this.quote_size = order.quote_size && { quote_size: order.quote_size },
                      limit_price: order.limit_price,
                      post_only: order.post_only || false
                    }
                  }
                : // if there is no end time and no stop price it is a MARKET ORDER 
                {
                  market_market_ioc: {
                    ...this.base_size = order.base_size && { base_size: order.base_size },
                    ...this.quote_size = order.quote_size && { quote_size: order.quote_size },
                  }
                }

        const data = {
          side: order.side,
          order_configuration: orderConfig,
          product_id: order.product_id,
          client_order_id: order.client_order_id || uuidv4()
        }

        // sign the request
        // console.log(data, 'is it a MARKET ORDER');

        if (data.order_configuration?.market_market_ioc?.base_size) {
          // this will be a market order and we need to fake it by making limit orders with extreme prices
          // because market order with base size is not supported right now
          console.log(data, 'making market order instead');

          const product = await this.getProduct(order.product_id);

          const tradeDetails = {
            // side: data.side,
            base_size: Number(data.order_configuration.market_market_ioc.base_size).toFixed(8), // BTC
            // product_id: data.product_id,
            // client_order_id: data.client_order_id,
            product: product,
            ...this.market_multiplier = order.market_multiplier && { market_multiplier: order.market_multiplier },
            ...data,
            // .toFixed(8)
          };

          // console.log(tradeDetails, 'details for placeMarketOrder');
          const result = await this.placeMarketOrder(tradeDetails)
          resolve(result);
          return
          // get current price
        }
        // console.log('market order should not go past this line');

        const options = this.signRequest(data, API);
        // make the call
        console.log(data, 'new order confige thing');
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

        const baseIncrement = order.product.base_increment;
        const quoteIncrement = order.product.quote_increment;

        // first figure out how many decimals we round to
        const reverseBaseInc = Number(baseIncrement.split("").reverse().join("")).toString().length;
        const reverseQuoteInc = Number(quoteIncrement.split("").reverse().join("")).toString().length;

        // then round to the correct resolution
        // const correctedBase = (Math.round((order.product.price * (order.market_multiplier || 2)) / baseIncrement) * baseIncrement).toFixed(reverseBaseInc)
        const correctedBuy = (Math.round((order.product.price * (order.market_multiplier || 2)) / quoteIncrement) * quoteIncrement).toFixed(reverseQuoteInc)
        const correctedSell = (Math.round((order.product.price / (order.market_multiplier || 2)) / quoteIncrement) * quoteIncrement).toFixed(reverseQuoteInc)
        // Don't.


        const data = {
          side: order.side,
          order_configuration: {
            limit_limit_gtc: {
              base_size: order.base_size,
              limit_price: (order.side === 'BUY')
                ? correctedBuy
                : correctedSell
              // ? order.product.quote_max_size
              // : order.product.quote_increment
            },

          },
          product_id: order.product_id,
          client_order_id: order.client_order_id || uuidv4()
        }
        console.log(data, 'fake market order setup');
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


module.exports = { Coinbase };