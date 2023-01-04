const { autoSetup } = require("../../src/shared");
const databaseClient = require("./databaseClient");
const { flipTrade } = require("./robot");
const { v4: uuidv4 } = require('uuid');

// receive data from the parent process
process.on("message", async (data) => {
  // process the data
  const simResults = await optimize(data);
  // send the processed data back to the parent process
  process.send(simResults);
});

async function optimize(data) {
  console.log(data, 'data');

  // get the initial price by getting the first candle from the db for the simStartDate
  // first turn the simStartDate into a unix timestamp
  const simStartDate = new Date(data.options.simStartDate).getTime() / 1000;
  const candles = await databaseClient.getNextCandles(data.user.id, data.options.product_id, 'ONE_MINUTE', simStartDate - 1);
  data.candles = candles;

  // array to store the results of each simulation
  const simResults = [];

  // start the pair percentage at 0
  data.options.trade_pair_ratio = 0.1;
  console.log(data.options, 'data.options after setting trade_pair_ratio to 0');

  // run the simulation until the pair ratio is 10, incrementing by 0.1 each time
  while (data.options.trade_pair_ratio <= 10) {
    // run the simulation
    const simResult = await runSimulation(data);
    // create an object with the pair ratio and the profit
    const result = {
      pairRatio: data.options.trade_pair_ratio.toFixed(1),
      profit: simResult.profit,
    };
    // add the result to the simResults array
    simResults.push(result);
    // increment the pair ratio by 0.1
    data.options.trade_pair_ratio += 0.1;
    // round the pair ratio to 1 decimal place
    data.options.trade_pair_ratio = Math.round(data.options.trade_pair_ratio * 10) / 10;
  }

  // find the pair ratio that produced the highest profit
  const bestPairRatio = simResults.reduce((prev, current) => (prev.profit > current.profit) ? prev : current);
  console.log('bestPairRatio', bestPairRatio);


  return {simResults, bestPairRatio};
}


// run the simulation
async function runSimulation(data) {
  const user = data.user;
  const options = data.options;
  const feeRate = Number(user.maker_fee);
  const candles = data.candles;


  // console.log('simStartDate', simStartDate);
  // get all candles after the simStartDate
  // console.log('candles', candles[0].open);
  // the open price of the first candle is the tradingPrice for auto setup
  options.tradingPrice = Number(candles[0].open);
  // console.log('simulation options:', user, options);

  // run the auto setup to get the initial orderList
  const initialSetup = autoSetup(user, options);
  // give each order a unique id and a next order id
  initialSetup.orderList.forEach(order => order.client_order_id = uuidv4());
  initialSetup.orderList.forEach(order => order.next_client_order_id = uuidv4());
  // divide the setup orderList into two arrays, one for buy orders and one for sell orders
  const buyOrders = initialSetup.orderList.filter(order => order.side === 'BUY');
  const sellOrders = initialSetup.orderList.filter(order => order.side === 'SELL');
  // console.log('buyOrders', buyOrders);
  // console.log('sellOrders', sellOrders);

  // hold data that will be returned to the client
  let profit = 0;

  // set up the user object to be used in the simulation
  const simUser = { ...user };
  simUser.reinvest = false;

  // iterate through the candles and run the simulation
  for (let i = 0; i < candles.length; i++) {
    // for (let i = 0; i < 100; i++) {
    // get the current candle
    const candle = candles[i];
    // get the current high and low prices
    const high = Number(candle.high);
    const low = Number(candle.low);
    // console.log('high', high);
    // console.log('low', low);
    // find all the buy orders that are triggered by the current candle
    const triggeredBuyOrders = buyOrders.filter(order => order.original_buy_price >= low);
    // triggeredBuyOrders.length && console.log('triggeredBuyOrders', triggeredBuyOrders);
    // flip the triggered buy orders to sell orders
    const flippedSellOrders = flipTriggeredOrders(triggeredBuyOrders, simUser);
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
    const flippedBuyOrders = flipTriggeredOrders(triggeredSellOrders, simUser);
    // add the buy orders to the buyOrders array
    buyOrders.push(...flippedBuyOrders);
    // remove the sell orders from the sellOrders array. can identify them by the client_order_id
    triggeredSellOrders.forEach(order => {
      const index = sellOrders.findIndex(sellOrder => sellOrder.client_order_id === order.client_order_id);
      sellOrders.splice(index, 1);
    });




  }

  // console.log('buyOrders', buyOrders.length);
  // console.log('sellOrders', sellOrders.length);



  // run autoSetup to get a list of orders to place

  // console.log('! ~ simulation complete ~ !');
  // console.log('profit', profit);

  // return the data to the parent process
  return { profit };


  function flipTriggeredOrders(triggeredOrders, user) {
    const newOrders = [];
    for (let j = 0; j < triggeredOrders.length; j++) {
      const originalOrder = triggeredOrders[j];
      const flippedOrder = flipTrade(originalOrder, user, triggeredOrders, { availableFunds: 1000 });
      // add next client unique id to the flipped order. flipTrade needs this
      flippedOrder.next_client_order_id = uuidv4();
      // console.log('flippedOrder', flippedOrder, flippedOrder.limit_price * flippedOrder.base_size);
      // console.log('')
      // add the original_buy_price and original_sell_price to the sell order
      flippedOrder.original_buy_price = originalOrder.original_buy_price;
      flippedOrder.original_sell_price = originalOrder.original_sell_price;

      // calculate the fees that would have been paid for the original order, and the flipped order
      const fees = originalOrder.limit_price * originalOrder.base_size * feeRate + flippedOrder.limit_price * flippedOrder.base_size * feeRate;

      // console.log(fees, 'what are the fees?')

      // if it is flipping a sell, need to calculate the profit
      if (originalOrder.side === 'SELL') {
        // console.log('originalOrder', originalOrder);
        // console.log('flippedOrder', flippedOrder);
        // calculate the profit
        const orderProfit = originalOrder.limit_price * originalOrder.base_size - flippedOrder.limit_price * flippedOrder.base_size;
        // console.log('orderProfit', orderProfit);
        // subtract the fees from the profit
        const netProfit = orderProfit - fees;
        // const netProfit = orderProfit;
        // console.log('net profit', netProfit);
        // add the net profit to the total profit
        profit += netProfit;
      }


      // add the sell order to the newOrders array
      newOrders.push(flippedOrder);

      // console.log('buyOrders', buyOrders.length);
      // console.log('sellOrders', sellOrders.length);
    }
    // return the new orders
    return newOrders;
  }
}