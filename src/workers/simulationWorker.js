import { autoSetup } from "../shared.js";
import { databaseClient } from "../../server/modules/databaseClient.js";
import { flipTrade } from "../../server/modules/robot.js";
import { v4 as uuidv4 } from 'uuid';

// receive data from the parent process
process.on("message", async (data) => {
  // process the data
  const simResults = await optimize(data);
  // send the processed data back to the parent process
  process.send(simResults);
});


//////////////////////////////////
//// find the best pair ratio - run the simulation for many ratios until the profit stops increasing
//////////////////////////////////
async function optimize(data) {
  // console.log(data, 'data');
  const options = data.options;
  options.product_id = options.product.product_id
  // this user is the user who sent the request to run the simulation
  const user = data.user;

  // get the initial price by getting the first candle from the db for the simStartDate
  // first turn the simStartDate into a unix timestamp
  const simStartDate = new Date(options.simStartDate).getTime() / 1000;
  // console.log(data, 'data');
  const candles = await databaseClient.getNextCandles(options.product.product_id, 'ONE_MINUTE', simStartDate - 1);
  // data.candles = candles;

  // array to store the results of each simulation
  const simResults = [];

  // start the pair percentage at 0.1
  options.trade_pair_ratio = 0.1;
  // options.trade_pair_ratio = 2;
  // console.log(options, 'options after setting trade_pair_ratio to 0');

  options.candles = candles;


  // run the simulation until the pair ratio is 20, incrementing by 0.1 each time
  while (options.trade_pair_ratio <= 20) {
    // while (options.trade_pair_ratio <= 2) {

    /////////////////////
    // run the simulation
    const simResult = await runSimulation(options);
    console.log(simResult, 'simResult');

    if (!simResult.valid) {
      console.log(simResult, 'invalid sim result');
      return { valid: false, message: 'Invalid simulation result' };
    }

    // create an object with the pair ratio and the profit
    const result = {
      pairRatio: options.trade_pair_ratio.toFixed(1),
      profit: simResult.profit,
    };
    // add the result to the simResults array
    simResults.push(result);

    // find the pair ratio that produced the highest profit
    const bestPairRatio = simResults.reduce((prev, current) => (prev.profit > current.profit) ? prev : current);
    console.log('bestPairRatio:', Number(bestPairRatio.pairRatio), 'current ratio:', options.trade_pair_ratio);

    // check if the current pair ratio is 5 greater than the best pair ratio
    if (options.trade_pair_ratio >= Number(bestPairRatio.pairRatio) + 5) {
      // if so, break out of the loop
      console.log('best ratio has been found, breaking out of the loop');
      break;
    }

    // increment the pair ratio by 0.1
    options.trade_pair_ratio += 0.1;
    // round the pair ratio to 1 decimal place
    options.trade_pair_ratio = Math.round(options.trade_pair_ratio * 10) / 10;
  }

  // find the pair ratio that produced the highest profit
  const bestPairRatio = simResults.reduce((prev, current) => (prev.profit > current.profit) ? prev : current);
  // console.log('bestPairRatio', bestPairRatio);


  return { simResults, bestPairRatio, valid: true };
}

////////////////////////////
//// run the simulation - run the simulation for one pair ratio
////////////////////////////
async function runSimulation(data) {
  // console.log(data, 'data in runSimulation');
  const user = data.simUser;
  const options = data;
  // console log each key in options
  // Object.keys(options).forEach(key => console.log(key, key === 'candles' ? options[key].length : options[key], 'options key'));
  // startingValue options key
  // skipFirst options key
  // endingValue options key
  // ignoreFunds options key
  // increment options key
  // incrementType options key
  // size options key
  // maxSize options key
  // sizeType options key
  // trade_pair_ratio options key
  // sizeCurve options key
  // steepness options key
  // simStartDate options key
  // availableQuote options key
  // tradingPrice options key
  // product options key
  // simUser options key
  // candles options key

  const product = options.product;
  const product_id = product.product_id;
  const feeRate = Number(user.maker_fee);
  const candles = data.candles;

  // console.log(candles.length, 'candle length in runSimulation');

  // const product = user.availableFunds[options.product.product_id];

  // options.product = product;

  // console.log('simStartDate', simStartDate);
  // get all candles after the simStartDate
  // console.log('candles', candles[0].open);
  // the open price of the first candle is the tradingPrice for auto setup
  options.tradingPrice = Number(candles[0].open);
  // console.log('simulation options:', user, options);

  // // need to have user.availableFunds[product_id] valid for autoSetup
  // console.log(user.availableFunds[options.product.product_id], 'user.availableFunds[options.product.product_id]');

  // if (!user.availableFunds[options.product.product_id]) {
  //   console.log('no available funds for product_id');
  //   return { valid: false, profit: 0 };
  // }

  // run the auto setup to get the initial orderList
  // console.log('running auto======= setup', options.tradingPrice);
  // await sleep(30000);
  const initialSetup = autoSetup(user, options);
  // console.log('initialSetup', initialSetup.orderList.length);
  // give each order a unique id and a next order id
  initialSetup.orderList.forEach(order => order.client_order_id = uuidv4());
  initialSetup.orderList.forEach(order => order.next_client_order_id = uuidv4());
  // calculate the dollar value of each order
  initialSetup.orderList.forEach(order => order.dollar_value = order.base_size * order.limit_price);

  // divide the setup orderList into two arrays, one for buy orders and one for sell orders
  const buyOrders = initialSetup.orderList.filter(order => order.side === 'BUY');
  const sellOrders = initialSetup.orderList.filter(order => order.side === 'SELL');
  // console.log('buyOrders', buyOrders.length);
  // console.log('sellOrders', sellOrders[0]);

  // await sleep(1000);

  // hold data that will be returned to the client
  let profit = 0;

  console.log('starting simulation');
  // iterate through the candles and run the simulation
  for (let i = 0; i < candles.length; i++) {
    // for (let i = 0; i < 100; i++) {
    // get the current candle
    const candle = candles[i];
    // get the current high and low prices
    const high = Number(candle.high);
    const low = Number(candle.low);

    // find all the buy orders that are triggered by the current candle
    const triggeredBuyOrders = buyOrders.filter(order => order.original_buy_price >= low);

    // flip the triggered buy orders to sell orders
    const flippedSellOrders = await flipTriggeredOrders(triggeredBuyOrders, user);
    // add the sell orders to the sellOrders array
    sellOrders.push(...flippedSellOrders);
    // remove the buy orders from the buyOrders array. can identify them by the client_order_id
    triggeredBuyOrders.forEach(order => {
      const index = buyOrders.findIndex(buyOrder => buyOrder.client_order_id === order.client_order_id);
      buyOrders.splice(index, 1);
    });



    // find all the sell orders that are triggered by the current candle
    const triggeredSellOrders = sellOrders.filter(order => order.original_sell_price <= high);
    // triggeredSellOrders.length && console.log('triggeredSellOrders', triggeredSellOrders);
    // flip the triggered sell orders to buy orders
    const flippedBuyOrders = await flipTriggeredOrders(triggeredSellOrders, user);
    // add the buy orders to the buyOrders array
    buyOrders.push(...flippedBuyOrders);
    // remove the sell orders from the sellOrders array. can identify them by the client_order_id
    triggeredSellOrders.forEach(order => {
      const index = sellOrders.findIndex(sellOrder => sellOrder.client_order_id === order.client_order_id);
      sellOrders.splice(index, 1);
    });
  }

  console.log('simulation complete', profit);
  // return the data to the parent process
  return { valid: true, profit };


  async function flipTriggeredOrders(triggeredOrders, user) {
    const newOrders = [];
    for (let j = 0; j < triggeredOrders.length; j++) {
      const originalOrder = triggeredOrders[j];

      // calculate the current fees to simulate the fees coinbase would charge on settlement
      originalOrder.total_fees = originalOrder.limit_price * originalOrder.base_size * user.maker_fee

      // console.log('originalOrder', originalOrder);

      const flippedOrder = flipTrade(originalOrder, user, triggeredOrders, true);
      // add next client unique id to the flipped order. flipTrade needs this
      flippedOrder.next_client_order_id = uuidv4();

      // calculate the previous fees on sell orders
      flippedOrder.previous_total_fees = (flippedOrder.side === 'BUY')
        ? null
        : originalOrder.original_buy_price * originalOrder.base_size * user.maker_fee;

      // calculate the dollar value of the flipped order
      flippedOrder.dollar_value = flippedOrder.limit_price * flippedOrder.base_size;

      // add the original_buy_price and original_sell_price to the sell order
      flippedOrder.original_buy_price = originalOrder.original_buy_price;
      flippedOrder.original_sell_price = originalOrder.original_sell_price;

      // if it is flipping a sell, need to calculate the profit
      if (originalOrder.side === 'SELL') {
        // calculate the profit
        const allProfit = calculateProfitBTC(originalOrder)
        // add the net profit to the total profit
        profit += allProfit.profit;
      }

      // add the sell order to the newOrders array
      newOrders.push(flippedOrder);
    }
    // return the new orders
    return newOrders;
  }
}

function calculateProfitBTC(dbOrder) {

  // margin is the difference between the original buy price and the original sell price
  let margin = (dbOrder.original_sell_price - dbOrder.original_buy_price)
  // why did I do this?? How does this make sense? 
  // Because the original buy price is the price of the coin, not the dollar value of the coin
  // so we need to multiply the margin by the size of the order to get the dollar value of the margin
  // Copilot has given me an answer that makes sense, but I have no idea how my brain came up with this before.
  let grossProfit = Number(margin * dbOrder.base_size)
  let profit = Number(grossProfit - (Number(dbOrder.total_fees) + Number(dbOrder.previous_total_fees)))
  let profitBTC = Number((Math.floor((profit / dbOrder.limit_price) * 100000000) / 100000000))

  return { profitBTC, profit };
}