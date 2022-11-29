// this file has functions used by both client and server, so no need to write them twice
function autoSetup(user, options) {

  // create an array to hold the new trades to put in
  const orderList = [];

  // SHORTEN PARAMS for better readability
  let availableFunds = options.availableFunds;
  let cost = 0;
  let base_size = options.base_size;
  let startingValue = options.startingValue;
  let endingValue = options.endingValue;
  let buyPrice = startingValue;
  let tradingPrice = options.tradingPrice;
  let increment = options.increment;
  let incrementType = options.incrementType;
  let trade_pair_ratio = options.trade_pair_ratio;
  let sizeType = options.sizeType;
  let skipFirst = options.skipFirst;
  let loopDirection = (endingValue - startingValue < 0) ? "down" : "up";

  let btcToBuy = 0;

  // prevent infinite loops and bad orders
  if (
    (startingValue === 0 && !skipFirst) ||
    startingValue <= 0 ||
    base_size <= 0 ||
    increment <= 0 ||
    trade_pair_ratio <= 0
  ) {
    return {
      cost: cost,
      orderList: [],
      btcToBuy: (btcToBuy / 100000000),
    }
  }

  // loop until one of the stop triggers is hit
  let stop = false;

  for (let i = 0; !stop; i++) {
    if (i === 0 && skipFirst) {
      // console.log('need to skip first one!');
      // increment buy price, but don't remove cost from funds
      incrementBuyPrice();
      // check if need to stop
      stopChecker();
      if (stop) {
        return {
          cost: cost,
          orderList: [],
          btcToBuy: (btcToBuy / 100000000),
        }
      }
      // skip the rest of the iteration and continue the loop
      continue;
    }

    // get buy price rounded to cents
    buyPrice = Number(buyPrice.toFixed(2));

    // get the sell price with the same math as is used by the bot when flipping
    let original_sell_price = (Math.round((buyPrice * (Number(trade_pair_ratio) + 100))) / 100);

    // figure out if it is going to be a BUY or a sell. Buys will be below current trade price, sells above.
    let side = (buyPrice > tradingPrice)
      ? 'SELL'
      : 'BUY'

    // set the current price based on if it is a BUY or sell
    let limit_price = (side === 'SELL')
      ? original_sell_price
      : buyPrice

    // if the base_size is in BTC, it will never change. 
    let actualSize = (sizeType === 'USD')
      ? Number(Math.floor((base_size / buyPrice) * 100000000)) / 100000000
      : base_size

    // count up how much BTC will need to be purchased to reserve for all the sell orders
    if (side === 'SELL') {
      btcToBuy += (actualSize * 100000000)
    }

    // calculate the previous fees on sell orders
    const previous_total_fees = (side === 'BUY')
      ? 0
      : buyPrice * actualSize * user.taker_fee

    // CREATE ONE ORDER
    const singleOrder = {
      original_buy_price: buyPrice,
      original_sell_price: original_sell_price,
      side: side,
      limit_price: limit_price,
      base_size: actualSize,
      previous_total_fees: previous_total_fees,
      total_fees: 0,
      product_id: options.product_id,
      stp: 'cn',
      userID: user.id,
      trade_pair_ratio: options.trade_pair_ratio,
    }

    // push that order into the order list
    orderList.push(singleOrder);

    // SETUP FOR NEXT LOOP - do some math to figure out next iteration, and if we should keep looping

    // subtract the buy base_size USD from the available funds
    // if sizeType is BTC, then we need to convert
    if (sizeType === 'BTC') {
      let USDSize = base_size * buyPrice;
      availableFunds -= USDSize;
      cost += USDSize;
    } else {
      // console.log('current funds', availableFunds);
      availableFunds -= base_size;
      cost += base_size;
    }

    // increment the buy price
    incrementBuyPrice();


    // STOP TRADING IF...

    // stop if run out of funds unless user specifies to ignore that
    stopChecker();
  }

  return {
    cost: cost,
    orderList: orderList,
    btcToBuy: (btcToBuy / 100000000),
  }

  function stopChecker() {
    let USDSize = base_size * buyPrice;
    // calc next round funds
    let nextFunds = (sizeType === 'BTC')
      ? availableFunds - USDSize
      : availableFunds - base_size
    // console.log(((availableFunds - nextFunds) < 0) && !options.ignoreFunds, nextFunds, 'next funds', availableFunds, !options.ignoreFunds);
    if (((nextFunds) < 0) && !options.ignoreFunds) {
      // console.log('ran out of funds!', availableFunds);
      stop = true;
    }
    // console.log('available funds is', availableFunds);
    // stop if the buy price passes the ending value
    if (loopDirection === 'up' && buyPrice > endingValue) {
      stop = true;
    } else if (loopDirection === 'down' && buyPrice < endingValue) {
      stop = true;
    } else if (loopDirection === 'down' && buyPrice <= 0) {
      stop = true;
    }
  }

  function incrementBuyPrice() {
    // can have either percentage or dollar amount increment
    if (incrementType === 'dollars') {
      // if incrementing by dollar amount
      (loopDirection === 'up')
        ? buyPrice += increment
        : buyPrice -= increment;
    } else {
      // if incrementing by percentage
      (loopDirection === 'up')
        ? buyPrice = buyPrice * (1 + (increment / 100))
        : buyPrice = buyPrice / (1 + (increment / 100));
    }
  }
}

module.exports = { autoSetup }