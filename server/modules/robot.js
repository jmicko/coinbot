const socketClient = require("./socketClient");

// toggle coinbot on and off
function toggleCoinbot() {
  // toggle coinbot boolean
  // if the bot should now be trading, it starts the loop
  if (robot.canToggle) {
    console.log('it can toggle!');
    // the /trade/toggle route will set canToggle to false as soon as it is called so that it 
    // doesn't call the loop twice. The loop will set it back to true after it finishes a loop
    robot.canToggle = !robot.canToggle;
    robot.looping = !robot.looping;
    robot.loop = 0;

    theLoop()
  } else {
    console.log('it cannot toggle!', robot.canToggle);
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
  };
  // add buy/sell requirement and price
  if (dbOrder.side === "buy") {
    // if it was a buy, sell for more. multiply old price
    tradeDetails.side = "sell"
    tradeDetails.price = dbOrder.original_sell_price;
    socketClient.emit('message', { message: `Flipping sides to SELL on order ${dbOrder.id}` });
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
  loop: 0,
  busy: 0,
  // store an array of orders that need to be updated after filling
  updateSpool: [],
  sleep: sleep,
  flipTrade: flipTrade,
  toggleCoinbot:toggleCoinbot,
}


module.exports = robot;