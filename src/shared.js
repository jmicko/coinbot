// this file has functions used by both client and server, so no need to write them twice.
// or for when circular imports would be a problem
// DO NOT put anything in here that should never be seen by the client


// function to pause for x milliseconds in any async function
function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// taken from https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
const numberWithCommas = (x) => {
  // this will work in safari once lookbehind is supported
  // return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
  // for now, use this
  // console.log('x', x)
  if (x !== null && x !== undefined) {
    let parts = Number(x).toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  } else {
    return "null"
  }
}


// this equation could give us a set of trade sizes that is larger at the current trading price
// and smaller as you move away
// where y = trade size, x = pair price and x=0 is the starting price
// no wait, change the x - 0. O would be replaced with the current trading price
// y = 5/(1 + 0.1( x - 0 )^2 ) + 1
// y = 5/(1 + 0.1( x - tradingPrice )^2 ) + 1

// y = 𝑎/(1+𝑏(𝑥−𝑐)^2)+𝑑

// y = a/(1 + b( x - c )^2 ) + d

// pairSize = maxSize / (1 + (increment * steepness) * ( buyPrice - tradingPrice )^2 ) + minSize

// a →represent the maximum value of your function -> this could be the maximum base size?
// b→ represents how steep your function is -> this could maybe be the increment? maybe multiplied by a steepness factor?
// c→represents the x co-ordinate of your peak -> this could be the current trading price?
// d→represents the minima of the function -> this could be the minimum base size?
// x→represents the x co-ordinate of the point you want to find the value of y for -> this could be the current pair buy price?
// y→represents the y co-ordinate of the point you want to find the value of y for -> this could be the trade pair size?
// the exponent also seems to control how sharp the peak is

// function to implement the above equation using the same variable names as above
function bellCurve(options) {
  const { maxSize, minSize, increment, steepness, buyPrice, tradingPrice } = options;
  return maxSize / (1 + (1 / (steepness * increment)) * (buyPrice - tradingPrice) ** 2) + minSize
}

function autoSetup(user, options) {
  const product_id = options.product_id;
  // console.log(product_id, 'product_id')
  // console.log(options.user, options.availableFunds, 'user')
  const available = user.availableFunds[product_id];

  if (!available) {
    return {
      valid: false,
      cost: 0,
      orderList: [],
      btcToBuy: 0,
      lastBuyPrice: 0,
      options: options,
      quoteToReserve: 0,
      buyCount: 0,
      sellCount: 0,
    }
  }
  // console.log(available, 'available')
  const decimals = addProductDecimals(available);
  // console.log(decimals, 'decimals')

  // create an array to hold the new trades to put in
  const orderList = [];

  // SHORTEN PARAMS for better readability
  let availableFunds = options.availableFunds;
  const size = options.base_size;
  const startingValue = options.startingValue;
  const endingValue = options.endingValue;
  const tradingPrice = options.tradingPrice;
  const increment = options.increment;
  const incrementType = options.incrementType;
  const trade_pair_ratio = options.trade_pair_ratio;
  const skipFirst = options.skipFirst;
  const sizeType = options.sizeType;
  const sizeCurve = options.sizeCurve;
  const maxSize = options.maxSize;
  const steepness = options.steepness;

  // initialize values for the loop
  let buyPrice = startingValue;
  let cost = 0;
  let loopDirection = (endingValue - startingValue < 0) ? "down" : "up";

  let btcToBuy = 0;
  let quoteToReserve = 0;
  let buyCount = 0;
  let sellCount = 0;

  // prevent infinite loops and bad orders
  if ((startingValue === 0 && !skipFirst) ||
    // startingValue <= 0 ||
    (startingValue === 0 && incrementType === 'percentage') ||
    (endingValue <= 0 && loopDirection === "up") ||
    size <= 0 ||
    increment <= 0 ||
    trade_pair_ratio <= 0 ||
    steepness <= 0 ||
    maxSize <= 0 ||
    tradingPrice <= 0) {
    return {
      valid: false,
      cost: cost,
      orderList: [],
      btcToBuy: (btcToBuy / decimals.baseMultiplier),

      lastBuyPrice: buyPrice,
      options: options,
      quoteToReserve: 0,
      buyCount: 0,
      sellCount: 0,
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
          valid: false,
          cost: cost,
          orderList: [],
          btcToBuy: (btcToBuy / decimals.baseMultiplier),

          lastBuyPrice: buyPrice,
          options: options,
          quoteToReserve: 0,
          buyCount: 0,
          sellCount: 0,
        }
      }
      // skip the rest of the iteration and continue the loop
      continue;
    }

    // get buy price rounded to cents
    buyPrice = Number(buyPrice.toFixed(2));

    // get the sell price with the same math as is used by the bot when flipping
    let original_sell_price = (Math.round((buyPrice * (Number(trade_pair_ratio) + decimals.quoteMultiplier))) / decimals.quoteMultiplier);

    // figure out if it is going to be a BUY or a sell. Buys will be below current trade price, sells above.
    let side = (buyPrice > tradingPrice)
      ? 'SELL'
      : 'BUY'

    // set the current price based on if it is a BUY or sell
    let limit_price = (side === 'SELL')
      ? original_sell_price
      : buyPrice

    let actualSize = getActualSize();


    // count up how much base currency will need to be purchased to reserve for all the sell orders
    if (side === 'SELL') {
      // console.log(actualSize, 'actualSize', (actualSize * decimals.baseMultiplier));
      // okay why does this multiply by decimals.baseMultiplier??
      // because later on, the actualSize is divided by decimals.baseMultiplier before returning it
      btcToBuy += (actualSize * decimals.baseMultiplier)
    }

    // calculate the previous fees on sell orders
    const previous_total_fees = (side === 'BUY')
      ? null
      : buyPrice * actualSize * user.taker_fee;

    // console.log(previous_total_fees);

    // CREATE ONE ORDER
    const singleOrder = {
      original_buy_price: buyPrice,
      original_sell_price: original_sell_price,
      side: side,
      limit_price: limit_price,
      base_size: actualSize,
      buy_quote_size: (actualSize * buyPrice).toFixed(2),
      sell_quote_size: (actualSize * original_sell_price).toFixed(2),
      previous_total_fees: previous_total_fees,
      total_fees: 0,
      product_id: options.product_id,
      stp: 'cn',
      userID: user.id,
      trade_pair_ratio: options.trade_pair_ratio,
    }

    // push that order into the order list
    orderList.push(singleOrder);

    // increase the buy count or sell count depending on the side
    side === 'BUY'
      ? buyCount++
      : sellCount++;

    // SETUP FOR NEXT LOOP - do some math to figure out next iteration, and if we should keep looping

    // subtract the buy size USD from the available funds
    // if sizeType is base, then we need to convert
    if (sizeType === 'base') {
      // let USDSize = size * buyPrice;
      // need to convert to USD. If is a buy, use the buy price, if a sell, use the trading price because that is what the bot will use
      const conversionPrice = (side === 'BUY')
        ? buyPrice
        : tradingPrice

      let USDSize = size * conversionPrice;
      availableFunds -= USDSize;
      cost += USDSize;
      // buy orders need to add quote value to quoteToReserve
      side === 'BUY' && (quoteToReserve += USDSize);
    } else {
      let quoteSize = size;

      // console.log('current funds', availableFunds);
      // if it is a sell, need to convert from quote to base size based on the buy price
      // then get the cost of the base size at the trading price,
      // then get the cost of the quote at the current price
      if (side === 'SELL') {
        // console.log(quoteSize, 'quote size SELLING');
        // console.log('need to convert to base size');
        // convert to base size
        const baseSize = quoteSize / buyPrice;
        // console.log('base size', baseSize);
        // convert to USD
        const USDSize = baseSize * tradingPrice;
        // console.log('USD size', USDSize);
        quoteSize = USDSize;
        // console.log(quoteSize, 'quote size actual cost SELLING');
      } else {
        // buy orders need to add quote value to quoteToReserve
        quoteToReserve += quoteSize;
      }

      availableFunds -= quoteSize;
      cost += quoteSize;
    }

    // increment the buy price
    incrementBuyPrice();


    // STOP TRADING IF...

    // stop if run out of funds unless user specifies to ignore that
    stopChecker();
  }

  // get the actual size in base currency of the trade
  function getActualSize() {
    // if sizeCurve is curve, use the bellCurve
    const newSize = (sizeCurve === 'curve')
      // adjust the size based on the curve
      ? curvedSize()
      // else leave the size alone
      : size;

    function curvedSize() {
      // if the increment type is percentage, convert it to a number
      // this is the same as the increment in the bellCurve, which is a dollar amount
      const newIncrement = incrementType === 'percentage'
        ? increment * buyPrice
        : increment

      // this will adjust the size based on where the buy price is on a curve
      return bellCurve({
        maxSize: maxSize - size,
        minSize: size,
        increment: newIncrement,
        steepness: steepness,
        buyPrice: buyPrice,
        tradingPrice: tradingPrice,
      })
    }

    if (sizeType === 'quote') {
      // if the size is in quote, convert it to base
      return Number(Math.floor((newSize / buyPrice) * decimals.baseMultiplier)) / decimals.baseMultiplier
    } else {
      // if the size is in base, it will not change. 
      return newSize
    }
  }

  // console.log(quoteToReserve, 'quoteToReserve');
  // console.log(buyCount, 'buyCount');
  return {
    valid: true,
    cost: cost,
    orderList: orderList,
    lastBuyPrice: orderList[orderList.length - 1]?.original_buy_price,
    btcToBuy: (btcToBuy / decimals.baseMultiplier),
    options: options,
    quoteToReserve: quoteToReserve,
    buyCount: buyCount,
    sellCount: sellCount,
  }

  function stopChecker() {
    let USDSize = size * buyPrice;
    // calc next round funds
    let nextFunds = (sizeType === 'base')
      ? availableFunds - USDSize
      : availableFunds - size
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

function addProductDecimals(product) {

  // console.log(product, '=====================product=====================');
  const baseIncrementDecimals = findDecimals(product?.base_increment);
  // console.log(baseIncrement, 'baseIncrement');
  // const quoteIncrement = findDecimals(product?.quote_increment);
  const quoteIncrementDecimals = findDecimals(product?.quote_increment);
  // inverse of the quote increment. This is used to round the size in quote to the nearest quote increment
  const quoteInverseIncrement = Math.pow(10, quoteIncrementDecimals);
  // inverse of the base increment. This is used to round the size in base to the nearest base increment
  const baseInverseIncrement = Math.pow(10, baseIncrementDecimals);
  // console.log(baseInverseIncrement, 'baseInverseIncrement', baseMultiplier === baseInverseIncrement, 'baseMultiplier');
  // create a rounding decimal place for the price. This is just nice to have and is not required
  const price_rounding = Math.pow(10, quoteIncrementDecimals - 2);





  return {
    ...product,
    baseIncrementDecimals,
    // quoteIncrement,
    quoteIncrementDecimals,
    // baseMultiplier,
    // quoteMultiplier,
    price_rounding,
    baseInverseIncrement,
    quoteInverseIncrement,
    // bidp,
    // qidp,
    
  };

  function findDecimals(number) {
    return number?.split('.')[1]?.split('').findIndex((char) => char !== '0') + 1;
  }
}

const granularities = [
  { name: 'ONE_MINUTE', readable: 'One Minute', value: 60 },
  { name: 'FIVE_MINUTE', readable: 'Five Minutes', value: 300 },
  { name: 'FIFTEEN_MINUTE', readable: 'Fifteen Minutes', value: 900 },
  { name: 'THIRTY_MINUTE', readable: 'Thirty Minutes', value: 1800 },
  { name: 'ONE_HOUR', readable: 'One Hour', value: 3600 },
  { name: 'TWO_HOUR', readable: 'Two Hours', value: 7200 },
  { name: 'SIX_HOUR', readable: 'Six Hours', value: 21600 },
  { name: 'ONE_DAY', readable: 'One Day', value: 86400 },
]

module.exports = { autoSetup, sleep, numberWithCommas, addProductDecimals, granularities }