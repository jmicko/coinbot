const socketClient = require("./socketClient");

// holds a list of trades that need to be sent. Any function can add to it by calling addToTradeQueue
const tradeQueue = [];

// takes trades that need to be sent and adds them to the tradeQueue if they aren't already there
const addToTradeQueue = async (trade) => {
  // check if the trade is new
  if (trade.isNew) {
    // if it is new, it comes from the ui. push it into tradeQueue
    tradeQueue.push(trade);
    console.log(tradeQueue);
  } else {
    // if it is not new, it will have an id. See if that id is already in the tradeQueue
    const duplicate = tradeQueue.filter(queuedTrade => {
      console.log(queuedTrade.id);
      console.log(trade.id);
      return queuedTrade.id == trade.id;
    });
    console.log('is it a duplicate?', duplicate.length);
    // if it is not in the tradeQueue, push it in. otherwise ignore it
    if (duplicate.length <= 0) {
      tradeQueue.push(trade);
      console.log('the queue looks like this now', tradeQueue);
    } else {
      console.log('IT IS A DUPLICATE!!!!!!!!!!', trade.id);
    }
  }
}

const trader = async () => {
  console.log('trader is trading');
  try {

    // check if the tradeQueue has any orders in it
    if (tradeQueue.length > 0) {
      console.log('there are trades to trade', tradeQueue.length);

      // if it does, take the first one and see if it is new
      if (tradeQueue[0].isNew) {
        
        console.log('the trade is new!', tradeQueue[0]);
        // todo - for now, new trades will be sent as normal and we will just unshift them here
        tradeQueue.shift();
        // if new, send it straight to exchange
      } else {
        // if not new, it was just settled. It needs to be flipped and then sent to exchange
        console.log('the trade is not new!', tradeQueue[0]);
        
      }
    }
  } catch (err) {
    console.log(err);
  } finally {
    // call trader function again when done
    await sleep(1000);
    trader();
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
  // store an array of orders that need to be updated after filling
  updateSpool: [],
  sleep: sleep,
  flipTrade: flipTrade,
  trader: trader,
  tradeQueue: tradeQueue,
  addToTradeQueue: addToTradeQueue,
}


module.exports = robot;