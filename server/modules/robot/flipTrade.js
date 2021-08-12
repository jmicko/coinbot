const socketClient = require('../socketClient');

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

  module.exports = flipTrade;