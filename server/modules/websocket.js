// JS Example for subscribing to a channel
/* eslint-disable */
const WebSocket = require('ws');
const CryptoJS = require('crypto-js');
const fs = require('fs');
const cache = require('./cache');

function startWebsocket(userID) {


  // Derived from your Coinbase Retail API Key
  //  SIGNING_KEY: the signing key provided as a part of your API key. Also called the "SECRET KEY"
  //  API_KEY: the api key provided as a part of your API key. also called the "PUBLIC KEY"
  const userAPI = cache.getAPI(userID)

  const SIGNING_KEY = userAPI.CB_SECRET;
  const API_KEY = userAPI.CB_ACCESS_KEY;

  if (!SIGNING_KEY.length || !API_KEY.length) {
    throw new Error('missing mandatory environment variable(s)');
  }

  // the various websocket channels you can subscribe to
  // add to this as we go
  const CHANNEL_NAMES = {
    level2: 'level2',
    user: 'user',
    tickers: 'ticker',
    ticker_batch: 'ticker_batch',
    status: 'status',
  };
  const products = ['BTC-USD', 'ETH-USD'];

  // The base URL of the API
  const WS_API_URL = 'wss://advanced-trade-ws.coinbase.com';

  // Function to generate a signature using CryptoJS
  function sign(str, secret) {
    const hash = CryptoJS.HmacSHA256(str, secret);
    return hash.toString();
  }

  function timestampAndSign(message, channel, products = []) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const strToSign = `${timestamp}${channel}${products.join(',')}`;
    const sig = sign(strToSign, SIGNING_KEY);
    return { ...message, signature: sig, timestamp: timestamp };
  }

  let ws = new WebSocket(WS_API_URL);

  function subscribeToProducts(products, channelName, ws) {
    console.log('products: %s', products.join(','));
    const message = {
      type: 'subscribe',
      channel: channelName,
      api_key: API_KEY,
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
      api_key: API_KEY,
      product_ids: products,
    };
    const subscribeMsg = timestampAndSign(message, channelName, products);
    ws.send(JSON.stringify(subscribeMsg));
  }

  function onMessage(data) {
    const parsedData = JSON.parse(data);
    fs.appendFile('Output1.txt', data, (err) => {
      // In case of a error throw err.
      if (err) throw err;
    });
  }

  open();

  function open() {

    ws = new WebSocket(WS_API_URL);

    // potentially reconnect every so often to get a snapshot update
    setTimeout(() => {
      console.log('reconnecting!');
      ws.close();
    }, 1000 * 5);

    ws.on('open', function () {
      console.log('OPENING');
      // subscribeToProducts(products, CHANNEL_NAMES.status, ws);
      subscribeToProducts(products, CHANNEL_NAMES.tickers, ws);
      subscribeToProducts(products, CHANNEL_NAMES.user, ws);
      // subscribeToProducts(products, CHANNEL_NAMES.ticker_batch, ws);
      // subscribeToProducts(products, CHANNEL_NAMES.level2, ws);
      // subscribeToUser(products, ws);
    });

    ws.on('close', function () {
      console.log('Socket was closed');

      fs.appendFile('ws-connection-log.txt', `${new Date}  \r\nUser ID: ${userID} \r\nattempting to reopen socket\r\n\r\n`, (err) => {
        // In case of a error log err.
        if (err) console.log(err, 'error writing to file');;
      });
      // always reopen the socket if it closes
      open();

    });

    ws.on('message', function (data) {
      const parsedData = JSON.parse(data);
      // console.log(parsedData, 'data from ws');
      if (parsedData.events) {
        parsedData.events.forEach(event => {
          if (event.tickers) {
            // console.log(event, event.type, 'event from ws');
            handleTickers(userID, event.tickers);
          } else {
            console.log(event, event.type, 'event from ws');
          }
        });
      }
      // console.log('');
    });
    
  }
  
}

function handleTickers(userID, tickers){
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

module.exports = { startWebsocket };