// this file has functions used by both client and server, so no need to write them twice.
// or for when circular imports would be a problem
// DO NOT put anything in here that should never be seen by the client

import { EventType, Product } from "./types";


// function to pause for x milliseconds in any async function
function sleep(milliseconds: number) {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

// taken from https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
const numberWithCommas = (x: number | string) => {
  // this will work in safari once lookbehind is supported
  // return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
  // for now, use this
  // devLog('x', x)
  if (x !== null && x !== undefined) {
    const parts = x.toString().split(".");
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
interface bellCurveOptions {
  maxSize: number,
  minSize: number,
  increment: number,
  steepness: number,
  buyPrice: number,
  // currentPrice: number,
  tradingPrice: number,
}
// function to implement the above equation using the same variable names as above
function bellCurve(options: bellCurveOptions) {
  const { maxSize, minSize, increment, steepness, buyPrice, tradingPrice } = options;
  return maxSize / (1 + (1 / (steepness * increment)) * (buyPrice - tradingPrice) ** 2) + minSize
}

// options object should have the following keys
// size: the size of the trade in either base or quote currency
// startingValue: the price to start the loop at
interface AutoSetupOptions {
  [key: string]: string | number | boolean | Product,
  product: Product,
  size: number,
  startingValue: number,
  endingValue: number,
  tradingPrice: number,
  increment: number,
  incrementType: string,
  trade_pair_ratio: number,
  skipFirst: boolean,
  sizeType: string,
  sizeCurve: string,
  maxSize: number,
  steepness: number,
  availableQuote: number,
  ignoreFunds: boolean,
}

interface User {
  id: number,
  taker_fee: number,
}

function autoSetup(user: User, options: AutoSetupOptions) {
  devLog('user', user, 'options', options);
  const product = options.product;
  const falseReturn = {
    valid: false,
  }

  // if any key in the options object is null or undefined, return falseReturn
  for (const key in options) {
    if (options[key] === null || options[key] === undefined) {
      devLog('bad options')
      return falseReturn;
    }
  }


  // create an array to hold the new trades to put in
  const orderList = [];

  // SHORTEN PARAMS for better readability
  // let availableFunds = options.availableFunds;
  let availableFunds = options.availableQuote;

  // devLog(availableFunds, 'availableFunds')

  const {
    size,
    startingValue,
    endingValue,
    tradingPrice,
    increment,
    incrementType,
    trade_pair_ratio,
    skipFirst,
    sizeType,
    sizeCurve,
    maxSize,
    steepness
  } = options;


  // initialize values for the loop
  let buyPrice = startingValue;
  let cost = 0;
  const loopDirection = (endingValue - startingValue < 0) ? "down" : "up";

  let btcToBuy = 0;
  let quoteToReserve = 0;
  let buyCount = 0;
  let sellCount = 0;


  // prevent infinite loops and bad orders
  if ((startingValue === 0 && !skipFirst) ||
    startingValue <= 0 ||
    // startingValue === null ||
    // startingValue === undefined ||
    (startingValue === 0 && incrementType === 'percentage') ||
    (endingValue <= startingValue && loopDirection === "up") ||
    size <= 0 ||
    increment <= 0 ||
    trade_pair_ratio <= 0 ||
    steepness <= 0 ||
    maxSize <= 0 ||
    tradingPrice <= 0) {
    devLog('bad options')
    return falseReturn;
  }
  // loop until one of the stop triggers is hit
  let stop = false;
  // for (let index = 0; index < array.length; index++) {
  //   const element = array[index];

  // }

  for (let i = 0; (!stop && i < 1000); i++) {
    if (i === 0 && skipFirst) {
      // devLog('need to skip first one!');
      // increment buy price, but don't remove cost from funds
      incrementBuyPrice();
      // check if need to stop
      stopChecker();
      if (stop) {
        devLog('stop triggered on first iteration')
        return falseReturn;
      }
      // skip the rest of the iteration and continue the loop
      continue;
    }
    // devLog(product.quote_increment_decimals, 'product.quote_increment_decimals')

    // get buy price rounded to cents the precision of the quote currency
    buyPrice = Number(buyPrice.toFixed(product.quote_increment_decimals));
    // get the sell price by multiplying the buy price by the trade pair ratio



    // let original_sell_price = (buyPrice * Number(trade_pair_ratio)).toFixed(product.quote_increment_decimals);
    // THIS IS NOT OLD CODE FROM WHEN BTC-USD WAS THE ONLY PRODUCT. Using 100 here because the trade_pair_ratio is a percentage. 
    const original_sell_price = (Math.round((buyPrice * (Number(trade_pair_ratio) + 100))) / 100);




    // devLog(tradingPrice, '<-tradingPrice', buyPrice > tradingPrice, '<-true if SELL', buyPrice, '<-buyPrice', original_sell_price, 'original_sell_price', trade_pair_ratio, 'trade_pair_ratio')
    // figure out if it is going to be a BUY or a sell. Buys will be below current trade price, sells above.
    const side = (buyPrice > tradingPrice)
      ? 'SELL'
      : 'BUY'

    // set the current price based on if it is a BUY or sell
    const limit_price = (side === 'SELL')
      ? original_sell_price
      : buyPrice

    // devLog(product.base_inverse_increment, 'product.base_inverse_increment')
    const actualSize = (getActualSize() * product.base_inverse_increment) / product.base_inverse_increment;


    // count up how much base currency will need to be purchased to reserve for all the sell orders
    if (side === 'SELL') {
      // devLog(actualSize, 'actualSize', (actualSize * product.base_inverse_increment));
      // okay why does this multiply by product.base_inverse_increment??
      // because later on, the actualSize is divided by product.base_inverse_increment before returning it
      btcToBuy += (actualSize * product.base_inverse_increment)
    }

    // calculate the previous fees on sell orders
    const previous_total_fees = (side === 'BUY')
      ? null
      : buyPrice * actualSize * user.taker_fee;

    // devLog(previous_total_fees);

    // CREATE ONE ORDER
    const singleOrder = {
      original_buy_price: buyPrice,
      original_sell_price: Number(original_sell_price),
      side: side,
      limit_price: limit_price,
      base_size: actualSize,
      buy_quote_size: Number((actualSize * buyPrice).toFixed(product.quote_increment_decimals)),
      sell_quote_size: Number((actualSize * original_sell_price).toFixed(product.quote_increment_decimals)),
      previous_total_fees: previous_total_fees,
      total_fees: 0,
      product_id: product.product_id,
      stp: 'cn',
      userID: user.id,
      trade_pair_ratio: options.trade_pair_ratio,
    }
    // devLog(singleOrder, 'singleOrder')

    // break out of the loop if the order is invalid
    if (singleOrder.base_size <= 0) {
      stop = true;
      continue;
    }
    if (singleOrder.limit_price <= 0) {
      stop = true;
      continue;
    }
    if (singleOrder.buy_quote_size <= 0) {
      stop = true;
      continue;
    }
    if (singleOrder.sell_quote_size <= 0) {
      stop = true;
      continue;
    }

    // devLog(singleOrder, 'singleOrder');
    // push that order into the order list
    orderList.push(singleOrder);

    // increase the buy count or sell count depending on the side
    side === 'BUY'
      ? buyCount++
      : sellCount++;

    ////////////////////////////
    // SETUP FOR NEXT LOOP - do some math to figure out next iteration, and if we should keep looping
    ////////////////////////////

    // subtract the buy size USD from the available funds
    // if sizeType is base, then we need to convert
    if (sizeType === 'base') {
      // let USDSize = size * buyPrice;
      // need to convert to USD. If is a buy, use the buy price, if a sell, use the trading price because that is what the bot will use
      const conversionPrice = (side === 'BUY')
        ? buyPrice
        : tradingPrice

      const USDSize = size * conversionPrice;
      availableFunds -= USDSize;
      cost += USDSize;
      // buy orders need to add quote value to quoteToReserve
      side === 'BUY' && (quoteToReserve += USDSize);
    } else {
      let quoteSize = size;

      // devLog('current funds', availableFunds);
      // if it is a sell, need to convert from quote to base size based on the buy price
      // then get the cost of the base size at the trading price,
      // then get the cost of the quote at the current price
      if (side === 'SELL') {
        // devLog(quoteSize, 'quote size SELLING');
        // devLog('need to convert to base size');
        // convert to base size
        const baseSize = quoteSize / buyPrice;
        // devLog('base size', baseSize);
        // convert to USD
        const USDSize = baseSize * tradingPrice;
        // devLog('USD size', USDSize);
        quoteSize = USDSize;
        // devLog(quoteSize, 'quote size actual cost SELLING');
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

  ////////////////////
  ////// RESULT ////// 
  ////////////////////
  // devLog('valid result')
  return {
    valid: true,
    cost: cost,
    orderList: orderList,
    lastBuyPrice: orderList[orderList.length - 1]?.original_buy_price,
    btcToBuy: (btcToBuy / product.base_inverse_increment),
    options: options,
    quoteToReserve: quoteToReserve,
    buyCount: buyCount,
    sellCount: sellCount,
  }

  ////////////////////
  ////// HELPERS /////
  ////////////////////

  // get the actual size in base currency of the trade
  function getActualSize() {
    // devLog(size, 'size');
    // if sizeCurve is curve, use the bellCurve
    const newSize = (sizeCurve === 'curve')
      // adjust the size based on the curve
      ? curvedSize()
      // else leave the size alone
      : size;

    // devLog(newSize, 'newSize');
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
      const bii = product.base_inverse_increment;
      const convertedToBase = Number(Math.floor((newSize / buyPrice) * bii)) / bii
      // devLog(convertedToBase, 'convertedToBase', buyPrice, 'buyPrice', product.base_inverse_increment, 'product.base_inverse_increment');
      return convertedToBase
    } else {
      // if the size is in base, it will not change. 
      return newSize
    }
  }

  // devLog(quoteToReserve, 'quoteToReserve');
  // devLog(buyCount, 'buyCount');

  function stopChecker() {
    const USDSize = size * buyPrice;
    // calc next round funds
    const nextFunds = (sizeType === 'base')
      ? availableFunds - USDSize
      : availableFunds - size
    // devLog(((availableFunds - nextFunds) < 0) && !options.ignoreFunds, nextFunds, 'next funds', availableFunds, !options.ignoreFunds);
    if (((nextFunds) < 0) && !options.ignoreFunds) {
      // devLog('ran out of funds!', availableFunds);
      stop = true;
    }
    // devLog('available funds is', availableFunds);
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
        // the hardcoded 100 is because the increment is a percentage, not old code
        ? buyPrice = buyPrice * (1 + (increment / 100))
        : buyPrice = buyPrice / (1 + (increment / 100));
    }
  }
}

// type Product = {
//   base_increment: string,
//   quote_increment: string,
//   base_increment_decimals: number,
//   quote_increment_decimals: number,
//   base_inverse_increment: number,
//   quote_inverse_increment: number,
//   baseMultiplier: number,
//   quoteMultiplier: number,
//   price_rounding: number,
//   baseIncrement: number,
//   quoteIncrement: number,
// }

function addProductDecimals(product: Product) {
  // if (!product) {
  //   return null;
  // }
  // devLog(product, '=====================product=====================');
  // const baseIncrementDecimals = findDecimals(product.base_increment);
  const base_increment_decimals = findDecimals(product.base_increment);
  // devLog(baseIncrement, 'baseIncrement');
  // const quoteIncrement = findDecimals(product.quote_increment);
  const quoteIncrementDecimals = findDecimals(product.quote_increment);
  const quote_increment_decimals = findDecimals(product.quote_increment);
  // change that to this_style_of_variable which is called snake_case
  // inverse of the quote increment. This is used to round the size in quote to the nearest quote increment
  // const quoteInverseIncrement = Math.pow(10, quoteIncrementDecimals);
  const quote_inverse_increment = Math.pow(10, quote_increment_decimals);
  // inverse of the base increment. This is used to round the size in base to the nearest base increment
  // const baseInverseIncrement = Math.pow(10, baseIncrementDecimals);
  const base_inverse_increment = Math.pow(10, base_increment_decimals);
  // devLog(baseInverseIncrement, 'baseInverseIncrement', base_inverse_increment === baseInverseIncrement, 'base_inverse_increment');
  // create a rounding decimal place for the price. This is just nice to have and is not required
  const price_rounding = Math.pow(10, quoteIncrementDecimals - 2);





  // return {
  //   ...product,
  //   baseIncrementDecimals,
  //   quoteIncrementDecimals,
  //   price_rounding,
  //   baseInverseIncrement,
  //   quoteInverseIncrement,
  //   base_increment_decimals,
  //   quote_increment_decimals,
  //   base_inverse_increment,
  //   quote_inverse_increment,
  // };
  const productWithDecimals: Product = {
    ...product,
    base_increment_decimals,
    quote_increment_decimals,
    base_inverse_increment,
    quote_inverse_increment,
    price_rounding,
  }
  return productWithDecimals;

  function findDecimals(number: string) {
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

// dev version of devLog that only logs when in dev mode
function devLog(...args: unknown[]) {
  const isDev = import.meta.env.MODE === 'development';
  if (isDev) {
    console.log(...args);
  }
}


const no = (e: EventType | TouchEvent) => { e.preventDefault(); }
const tNum = (e: EventType) => { no(e); return Number((e.target as HTMLInputElement).value) }

const toFloor = (value: number, rounding: number) => {

  return Math.floor(value * rounding) / rounding;
}
const fixedFloor = (value: number, rounding: number) => {
  // find number of times rounding can be divided by 10
  console.log(rounding, 'rounding');
  
  const logRound = Math.floor(Math.log10(rounding * 10));
  devLog(logRound, 'logRound');
  return (Math.floor(value * rounding) / rounding).toFixed(Number(logRound));
}
const fixedRound = (value: number, rounding: number) => {
  const logRound = Math.floor(Math.log10(rounding));
  devLog(logRound, 'logRound');
  return (Math.round(value * rounding) / rounding).toFixed(Number(logRound));
}

export { autoSetup, sleep, numberWithCommas, addProductDecimals, granularities, devLog, no, tNum, toFloor, fixedFloor, fixedRound }