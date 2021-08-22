const authedClient = require("./authedClient");
const pool = require("./pool");
const socketClient = require("./socketClient");

// holds a list of trades that need to be sent. Any function can add to it by calling addToTradeQueue
// recentHistory will hold 1000 trades, and can be used to double check if a trade is being added twice
// current will be trades that still need to be sent, and will be shifted out when done
const tradeQueue = {
  recentHistory: [],
  current: []
};

// takes trades that need to be sent and adds them to the tradeQueue if they aren't already there
const addToTradeQueue = async (trade) => {
  let result;
  // check if the trade is new
  if (trade.isNew) {
    // if it is new, it comes from the ui. push it into tradeQueue, but not 
    // current because it does not have an id, and there is no risk of duplication 
    tradeQueue.current.push(trade);
    result = true;
    console.log(tradeQueue);
  } else {
    // if it is not new, it will have an id. See if that id is already in the tradeQueue.recentHistory
    const duplicate = tradeQueue.recentHistory.filter(queuedTrade => {
      // console.log(queuedTrade.id);
      // console.log(trade.id);
      return queuedTrade.id == trade.id;
    });
    console.log('is it a duplicate?', duplicate.length);
    // if it is not in the tradeQueue.recentHistory, push it in. otherwise ignore it
    if (duplicate.length <= 0) {
      tradeQueue.recentHistory.push(trade);
      tradeQueue.current.push(trade);
      console.log('the queue looks like this now. history length:',
        tradeQueue.recentHistory.length, 'current:', tradeQueue.current);
    } else {
      console.log('IT IS A DUPLICATE!!!!!!!!!!', trade.id);
    }
  }
  // finally, check how long the recentHistory is. If it is more than 1000, shift the oldest item out
  if (tradeQueue.recentHistory.length > 1000) {
    tradeQueue.recentHistory.shift();
  }
  if (result) {
    return result;
  }
}


// function for flipping sides on a trade
// Returns the tradeDetails object needed to send trade to CB
const flipTrade = (dbOrder) => {
  // set up the object to be sent
  const tradeDetails = {
    side: '',
    price: '', // USD
    // when flipping a trade, size and product will always be the same
    size: dbOrder.size, // BTC
    product_id: dbOrder.product_id,
    stp: 'cn',
  };
  // add buy/sell requirement and price
  if (dbOrder.side === "buy") {
    // if it was a buy, sell for more. multiply old price
    tradeDetails.side = "sell"
    tradeDetails.price = dbOrder.original_sell_price;
    socketClient.emit('message', { message: `Selling order ${dbOrder.id} for $${dbOrder.price}` });
  } else {
    // if it was a sell, buy for less. divide old price
    tradeDetails.side = "buy"
    tradeDetails.price = dbOrder.original_buy_price;
    socketClient.emit('message', { message: `Flipping sides to BUY on order ${dbOrder.id}` });
  }
  // return the tradeDetails object
  return tradeDetails;
}


// function to pause for x milliseconds in any async function
const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

const robot = {
  // the /trade/toggle route will set canToggle to false as soon as it is called so that it 
  // doesn't call the loop twice. The loop will set it back to true after it finishes a loop
  canToggle: true,
  looping: false,
  wsTrading: 0,
  loop: 0,
  busy: 0,
  sleep: sleep,
  flipTrade: flipTrade,
  tradeQueue: tradeQueue,
  addToTradeQueue: addToTradeQueue,
}


module.exports = robot;