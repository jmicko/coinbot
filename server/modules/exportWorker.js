const databaseClient = require("./databaseClient");
const excel = require('exceljs');
const fs = require('fs');

console.log('worker file loaded');
if (process.isMainThread) {
  console.log('Running on main thread');
} else {
  console.log('Running in worker thread');
}

// receive data from the parent process
process.on('message', async (data) => {
  const cpuUsage = process.cpuUsage();
  console.log('worker cpu usage', cpuUsage);
  // process.send({ cpuUsage });

  console.log('worker received data', data);
  // process the data
  const processedData = await dataProcessor();
  // send the processed data back to the parent process
  process.send(processedData);

  async function dataProcessor() {
    if (data.type === 'candles') {
      return await processCandleData(data.params);
    } else if (data.type === 'orders') {
      // process the data
      return await processOrderData(data);
    }
  }
  // process.send(JSON.stringify(processedData));
});

async function processCandleData(data) {
  // perform some operations on the data and return the result
  console.log('processing data', data);

  // // ensure that the difference between the start and end dates divided by the granularity is less than 150_000
  // // get the value of the granularity
  // const granularityValue = granularities.find(granularityObj => granularityObj.name === granularity).value;
  // // console.log(granularityValue, 'granularity value');
  // // if the difference between the start and end dates divided by the granularity is greater than 150_000, send an error
  // if ((end - start) / granularityValue >= 35_000_000) {
  //   res.status(400).send(`The difference between the start and end dates divided by the granularity is greater than 100_000.
  //    Please select a smaller date range.`);
  //   return;
  // } else {
  //   console.log('granularity is good');
  // }


  // retrieve candle data from db
  const candleData = await databaseClient.getCandles(data.userID, data.product, data.granularity, data.start, data.end);

  console.log('candle data', candleData.length);

  for (let i = 0; i < candleData.length; i++) {
    for (let key in candleData[i]) {
      if (!isNaN(candleData[i][key])) {
        candleData[i][key] = Number(candleData[i][key]);
      }
      // console.log(candleData[i][key], 'candle key');
    }
  }

  // divide the candle data into an array of objects where the objects have the name of the month and year as the key and the value is an array of the candles for that month
  const candleDataByMonth = candleData.reduce((acc, candle) => {
    const date = new Date(candle.start * 1000);
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    const key = `${month} ${year}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(candle);
    return acc;
  }, {});

  // log the names of the months and years and the number of candles in each
  for (let key in candleDataByMonth) {
    console.log(key, candleDataByMonth[key].length);
  }






  console.log('creating workbook', candleData.length)
  // create workbook
  const workbook = new excel.Workbook();
  // create worksheet
  // const candleWorksheet = workbook.addWorksheet('Candles');

  // create a worksheet for each month
  for (let key in candleDataByMonth) {
    const candleWorksheet = workbook.addWorksheet(key);
    // add column headers. the object will look like this:
    // {
    //   id: 134246,
    //   user_id: '1',
    //   product_id: 'ETH-USD',
    //   granularity: 'SIX_HOUR',
    //   start: 1645596000,
    //   low: '2656.9700000000000000',
    //   high: '2740.0000000000000000',
    //   high_low_ratio: '1.0312498823848218',
    //   open: '2659.4800000000000000',
    //   close: '2721.5100000000000000',
    //   volume: '33135.9741297300000000'
    // }
    candleWorksheet.columns = [
      { header: 'id', key: 'id', width: 10 },
      { header: 'user_id', key: 'user_id', width: 10 },
      { header: 'product_id', key: 'product_id', width: 10 },
      { header: 'granularity', key: 'granularity', width: 10 },
      { header: 'start', key: 'start', width: 15 },
      { header: 'low', key: 'low', width: 22 },
      { header: 'high', key: 'high', width: 22 },
      { header: 'high_low_ratio', key: 'high_low_ratio', width: 22 },
      { header: 'open', key: 'open', width: 22 },
      { header: 'close', key: 'close', width: 22 },
      { header: 'volume', key: 'volume', width: 20 }
    ];

    // add rows for each candle in the month
    for (let i = 0; i < candleDataByMonth[key].length; i++) {
      candleWorksheet.addRow(candleDataByMonth[key][i]);
    }
    console.log('all rows added');

    // set the style for the header row
    candleWorksheet.getRow(1).font = { bold: true };

  }


  // set the style for the header row
  // candleWorksheet.getRow(1).font = { bold: true };
  console.log('header row styled');
  // send workbook to main process and check for errors
  // const buffer = 
  await workbook.xlsx.writeFile(`server/exports/${data.userID}-${data.product}-${data.granularity}-${data.start}-${data.end}.xlsx`);
  // console.log('buffer', buffer);
  // console.log('buffer created');
  // create and name the file
  // fs.writeFileSync(`server/exports/${data.userID}-${data.product}-${data.granularity}-${data.start}-${data.end}.xlsx`, buffer);
  console.log('file created');
  // return the file
  return `${data.userID}-${data.product}-${data.granularity}-${data.start}-${data.end}.xlsx`;
  // return buffer;
  // return workbook;
}

async function processOrderData(data) {
  // perform some operations on the data and return the result
  console.log('processing data', data);
  // // retrieve order data from db
  // const orderData = await databaseClient.getAllOrders(data.userID);

  // console.log('order data', orderData.length);

  // // convert all the values to numbers if they are numbers
  // for (let i = 0; i < orderData.length; i++) {
  //   for (let key in orderData[i]) {
  //     if (!isNaN(orderData[i][key])) {
  //       orderData[i][key] = Number(orderData[i][key]);
  //     }
  //     // console.log(orderData[i][key], 'order key');
  //   }
  // }

  // // divide the order data into an array of objects where the objects have the name of the month and year as the key and the value is an array of the orders for that month
  // const orderDataByMonth = orderData.reduce((acc, order) => {
  //   const date = new Date(order.flipped_at);
  //   const month = date.toLocaleString('default', { month: 'long' });
  //   const year = date.getFullYear();
  //   const key = `${month} ${year}`;
  //   if (!acc[key]) {
  //     acc[key] = [];
  //   }
  //   acc[key].push(order);
  //   return acc;
  // }, {});

  // // log the names of the months and years and the number of orders in each
  // for (let key in orderDataByMonth) {
  //   console.log(key, orderDataByMonth[key].length);
  // }
}