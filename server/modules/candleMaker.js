import { devLog, granularities, sleep } from "../../src/shared.js";
import { userStorage, cbClients } from "./cache.js";
// import { Coinbase } from "./coinbaseClient.js";
import { databaseClient } from "./databaseClient.js";

const sleepyTime = 300; // can adjust rate limiting here

console.log('candle maker is making candles');

// create and store Coinbase clients for each user


// receive data from the parent process
process.on('message', async (data) => {
  devLog('candle maker received data', data);

  switch (data.type) {
    case 'startUser':
      // need to generate user storage because it will create the coinbase client that we need
      // this has to be done here because the candle maker is a child process of the server
      await userStorage.createNewUser(data.user);

      await sleep(sleepyTime);
      downloadCandles(data.user);
      break;

    default: devLog('candle maker received unknown data type', data?.type);
      break;
  }
  // user will be an object like this:
  // user = {
  //   id: 1,
  //   username: 'admin',
  //   active: true,
  //   admin: true,
  //   approved: true,
  //   joined_at: '2022-11-29T17:49:02.916Z'
  // }


});

async function downloadCandles(user) {
  // devLog('downloadCandles', user, granularities);
  const userID = user.id;

  // first get the active products
  const activeProducts = await databaseClient.getActiveProducts(userID);

  // loop through the products and update the candles for each product one at a time
  // this is to avoid rate limiting
  for (let i = 0; i < activeProducts.length; i++) {
    const productID = activeProducts[i].product_id;

    devLog('product', productID);
    await updateCandlesForProduct({ productID, userID });
    // sleep in between to avoid rate limiting
    await sleep(sleepyTime);
  } // end for loop of products
  setTimeout(() => {
    downloadCandles(user);
  }, 10000);
}

async function updateCandlesForProduct({ productID, userID }) {
  // this function is called for each product before moving on to the next product
  // it will get the most recent candle for each granularity in a loop before moving on to the next granularity, 
  // then move on to the next product in the previous loop
  // this all needs to be done one at a time to avoid rate limiting
  for (let i = 0; i < granularities.length; i++) {
    try {
      const granularity = granularities[i];
      // devLog('granularity', granularity);

      // get the the candle from the database with the most recent time
      const newestCandle = await databaseClient.getNewestCandle(productID, granularity.name);
      // get the oldest candle from the database
      const oldestCandle = await databaseClient.getOldestCandle(productID, granularity.name);

      devLog('newestCandle', productID, granularity.name, 'newestCandle', newestCandle?.start ? new Date(newestCandle?.start * 1000) : 'no candle');
      devLog('oldestCandle', productID, granularity.name, 'oldestCandle', oldestCandle?.start ? new Date(oldestCandle?.start * 1000) : 'no candle');

      // if there is no candle in the database, get the most recent candles and continue
      if (!newestCandle) {
        // use a start date of 1 month ago. This will give us a good starting point for the simulator fairly quickly,
        // while conveniently being far enough back to get data for each granularity
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        // start date should be unix time in seconds
        const start = Math.floor(startDate.getTime() / 1000);
        // get the candles from that point on
        await getCandles({ userID, productID, granularity, start });
        await sleep(sleepyTime);
        continue;
      }

      // get the next newest candles...
      await getCandles({userID, productID, granularity, start: newestCandle?.start });
      await sleep(sleepyTime);
      // ...then get the next oldest candles...
      await getCandles({userID, productID, granularity, end: oldestCandle?.start });
      // then verify the integrity of the candles data in the database


    } catch (err) {
      console.log(err);
    }

    await sleep(sleepyTime);
  } // end for loop of granularities
}

async function getCandles({ userID, productID, granularity, start, end }) {
  // can change this number to change the number of candles, 300 max
  const numCandles = 300;
  const granMillis = granularity.value * 1000 * numCandles;
  // devLog('granMillis', granMillis, granularity)

  // if there is only a start date, calc the future end date based on the granularity
  // if there is only an end date, calc the past start date based on the granularity value, which is in seconds
  if (start && !end) {
    const startDate = start * 1000;
    // devLog('start date', startDate);
    const endDate = startDate + granMillis;
    // end date should be unix time in seconds
    end = Math.floor(endDate / 1000);
    // devLog('end date', end);
  } else if (end && !start) {
    const endDate = end * 1000;
    // devLog('end date', endDate);
    const startDate = endDate - granMillis;
    // start date should be unix time in seconds
    start = Math.floor(startDate / 1000);
    // devLog('start date', start);
  }



  devLog(productID, 'product id to get candles for')
  // get the most recent candles for the product and granularity
  // this will get the most recent 300 candles
  const params = {
    product_id: productID,
    start: start,
    end: end,
    granularity: granularity.name
  }

  devLog('params', params, userID);

  const result = await cbClients[userID].getMarketCandles(params);
  const candles = result.candles;
  devLog('saving candles', candles.length);

  // // insert the candles into the database
  await databaseClient.saveCandles(productID, granularity.name, candles);
}