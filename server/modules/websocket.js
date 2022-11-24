// JS Example for subscribing to a channel
/* eslint-disable */
const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const fs = require('fs');
const cache = require('./cache');

function startWebsocket(userID) {
  const userAPI = cache.getAPI(userID)
  const secret = userAPI.CB_SECRET;
  const key = userAPI.CB_ACCESS_KEY;

  if (!secret.length || !key.length) {
    throw new Error('missing mandatory environment variable(s)');
  }

  const products = ['BTC-USD', 'ETH-USD'];

  // Function to generate a signature using CryptoJS
  function sign(str, secret) {
    const hash = CryptoJS.HmacSHA256(str, secret);
    return hash.toString();
  }

  function timestampAndSign(message, channel, products = []) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const strToSign = `${timestamp}${channel}${products.join(',')}`;
    const sig = sign(strToSign, secret);
    return { ...message, signature: sig, timestamp: timestamp };
  }

  function subscribeToProducts(products, channelName, ws) {
    console.log('products: %s', products.join(','));
    const message = {
      type: 'subscribe',
      channel: channelName,
      api_key: key,
      product_ids: products,
      user_id: '',
    };
    const subscribeMsg = timestampAndSign(message, channelName, products);
    ws.send(JSON.stringify(subscribeMsg));
  }

  function unsubscribeToProducts(products, channelName, ws) {
    const message = {
      type: 'unsubscribe',
      channel: channelName,
      api_key: key,
      product_ids: products,
    };
    const subscribeMsg = timestampAndSign(message, channelName, products);
    ws.send(JSON.stringify(subscribeMsg));
  }

  // The base URL of the API
  const WS_API_URL = 'wss://advanced-trade-ws.coinbase.com';

  open();


  function open() {

    function timer() {
      clearTimeout(this.pingTimeout);
      // Use `WebSocket#terminate()`, which immediately destroys the connection,
      // instead of `WebSocket#close()`, which waits for the close timer.
      // Delay should be equal to the interval at which your server
      // sends out pings plus a conservative assumption of the latency.
      this.pingTimeout = setTimeout(() => {
        console.log('ending socket after timeout');
        this.terminate();
      }, 10000);
    }

    function ordersInterval() {
      clearInterval(this.getOrders);
      this.getOrders = setInterval(() => {
        console.log('getting orders');
        unsubscribeToProducts(products, 'user', ws);
        subscribeToProducts(products, 'user', ws);
      }, 10000);
    }

    console.log('OPENING');
    let ws = new WebSocket(WS_API_URL);

    ws.on('open', function () {
      console.log('Socket open!');
      subscribeToProducts(products, 'ticker', ws);
      subscribeToProducts(products, 'user', ws);
    });

    ws.on('close', function () {
      console.log('Socket was closed');

      fs.appendFile('ws-connection-log.txt', `${new Date}  \r\nUser ID: ${userID} \r\nattempting to reopen socket\r\n\r\n`, (err) => {
        // In case of a error log err.
        if (err) console.log(err, 'error writing to file');;
      });
      // always reopen the socket if it closes
      setTimeout(() => {
        open();
      }, 1000);

    });

    ws.on('error', (error) => {
      console.log(error, 'error on ws connection');
    });

    ws.on('message', function (data) {
      const parsedData = JSON.parse(data);
      // if (parsedData.channel) {
      //   console.log(parsedData.channel, 'channel from ws', parsedData);
      // }
      if (parsedData.events) {
        parsedData.events.forEach(event => {
          if (event.tickers) {
            // console.log(event, event.type, 'event from ws');
            handleTickers(event.tickers);
          } else if (event.type === 'snapshot') {
            handleSnapshot(event);
          } else {
            console.log(event, event.type, 'event from ws');
          }
        });
      }
      // console.log('');
    });


    ws.on('open', timer);
    // ws.on('open', ordersInterval);
    ws.on('message', timer);
    ws.on('close', function clear() {
      clearTimeout(this.pingTimeout);
      // clearInterval(this.getOrders)
    });

  }

  function handleSnapshot(event) {
    // every tick, send an update to open consoles for the user
    console.log(event, 'handling snapshot');

  }

  function handleTickers(tickers) {
    // every tick, send an update to open consoles for the user
    // console.log('handling tickers');
    tickers.forEach(ticker => {
      cache.sockets.forEach(socket => {
        // find each open socket for the user
        if (socket.userID === userID) {
          // console.log(socket.userID, userID)
          const msg = {
            type: 'ticker',
            ticker: ticker
          }
          // send the message
          socket.emit('message', msg);
        }
      })
      return
    });

  }
}

function getOpenOrders(userID) {
  return new Promise(async (resolve, reject) => {
    const userAPI = cache.getAPI(userID)
    const secret = userAPI.CB_SECRET;
    const key = userAPI.CB_ACCESS_KEY;

    if (!secret.length || !key.length) {
      throw new Error('missing mandatory environment variable(s)');
    }

    const products = ['BTC-USD', 'ETH-USD'];

    // Function to generate a signature using CryptoJS
    function sign(str, secret) {
      const hash = CryptoJS.HmacSHA256(str, secret);
      return hash.toString();
    }

    function timestampAndSign(message, channel, products = []) {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const strToSign = `${timestamp}${channel}${products.join(',')}`;
      const sig = sign(strToSign, secret);
      return { ...message, signature: sig, timestamp: timestamp };
    }

    function subscribeToProducts(products, channelName, ws) {
      console.log('products: %s', products.join(','));
      const message = {
        type: 'subscribe',
        channel: channelName,
        api_key: key,
        product_ids: products,
        user_id: '',
      };
      const subscribeMsg = timestampAndSign(message, channelName, products);
      ws.send(JSON.stringify(subscribeMsg));
    }

    // The base URL of the API
    const WS_API_URL = 'wss://advanced-trade-ws.coinbase.com';

    open();

    function open() {

      function timer() {
        clearTimeout(this.pingTimeout);
        this.pingTimeout = setTimeout(() => {
          console.log('ending socket after timeout');
          reject();
          this.terminate();
        }, 5000);
      }

      let ws = new WebSocket(WS_API_URL);

      ws.on('open', function () {
        // console.log('Get orders socket open!');
        subscribeToProducts(products, 'user', ws);
      });

      ws.on('message', function (data) {
        const parsedData = JSON.parse(data);

        if (parsedData.events) {
          parsedData.events.forEach(event => {
            if (event.type === 'snapshot') {
              handleSnapshot(event);
            }
          });
        }
      });

      function handleSnapshot(event) {
        if (event.orders) {
          resolve(event.orders);
          ws.close();
        }
      }

      ws.on('open', timer);
      ws.on('close', function clear() {
        clearTimeout(this.pingTimeout);
      });
    }
  })
}

module.exports = { startWebsocket, getOpenOrders };