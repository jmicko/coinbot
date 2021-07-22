const flipTrade = (dbOrder, cbOrder) => {
    // set up the object to be sent
    const tradeDetails = {
      side: '',
      price: '', // USD
      // when flipping a trade, size and product will always be the same
      size: dbOrder.size, // BTC
      product_id: cbOrder.product_id,
    };
  
    // todo - need to store more info in db
    // need the trade-pair margin instead of calculating new price each time
  
    // add buy/sell requirement and price
    if (cbOrder.side === "buy") {
      // if it was a buy, sell for more. multiply old price
      tradeDetails.side = "sell"
      tradeDetails.price = ((Math.round((dbOrder.price * 1.03) * 100)) / 100);
      console.log('selling');
    } else {
      // if it was a sell, buy for less. divide old price
      tradeDetails.side = "buy"
      tradeDetails.price = ((Math.round((dbOrder.price / 1.03) * 100)) / 100);
      console.log('buying');
    }
    // return the tradeDetails object
    return tradeDetails;
  }

  module.exports = flipTrade;