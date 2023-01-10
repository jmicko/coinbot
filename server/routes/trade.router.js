const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const databaseClient = require('../modules/databaseClient');
const robot = require('../modules/robot');
const { cache, userStorage, cbClients, messenger } = require('../modules/cache');
const { v4: uuidv4 } = require('uuid');
const { autoSetup, sleep } = require('../../src/shared');

const { fork } = require('child_process');
// const { autoSetup } = require('../../src/shared');

/**
 * POST route sending basic market trade
 */
router.post('/market', rejectUnauthenticated, async (req, res) => {
  console.log('basic trade post route hit', req.body);
  // POST route code here
  const user = req.user;
  const userID = req.user.id;
  const order = req.body;
  if (user.active && user.approved) {
    // tradeDetails const should take in values sent from trade component form
    const tradeDetails = {
      side: order.side,
      base_size: order.base_size.toFixed(8), // BTC
      product_id: order.product_id,
      userID: userID,
      market_multiplier: 1.1
    };
    console.log('BIG order', tradeDetails);

    try {
      // send the new order with the trade details
      let basic = await cbClients[userID].placeOrder(tradeDetails);
      console.log('basic trade results', basic,);

      if (!basic.success) {
        messenger[userID].newError({
          errorData: basic,
          errorText: `Could not place trade. ${basic?.error_response?.message}`
        });

      }

      await robot.updateFunds(userID);

      // send OK status
      res.sendStatus(200);

    } catch (err) {
      if (err.response?.status === 400) {
        console.log('Insufficient funds!');
      } else if (err.code && err.code === 'ETIMEDOUT') {
        console.log('Timed out');
      } else {
        console.log(err, 'problem in sending trade post route');
      }
      // send internal error status
      res.sendStatus(500);
    }
  } else {
    console.log('user is not active and cannot trade!');
    res.sendStatus(404)
  }
});

/**
 * POST route for auto setup
 */
router.post('/autoSetup', rejectUnauthenticated, async (req, res) => {
  console.log('in auto setup route!');
  // POST route code here
  const user = req.user;
  if (user.active && user.approved) {
    // get the user available funds
    const funds = userStorage[user.id].getAvailableFunds();
    user.availableFunds = funds;
    let options = req.body;
    let setup = autoSetup(user, options)
    // console.log('setup is:', setup);
    try {
      console.log('setup options:', options);
      // put a market order in for how much BTC need to be purchase for all the sell orders
      // if (false) {
      if (setup.btcToBuy >= 0.000016) {
        const tradeDetails = {
          side: 'BUY',
          base_size: setup.btcToBuy.toFixed(8), // BTC
          product_id: options.product_id,
          type: 'market',
          // tradingPrice: options.tradingPrice
        };
        console.log('BIG order', tradeDetails);
        if (!options.ignoreFunds) {
          let bigOrder = await cbClients[user.id].placeOrder(tradeDetails);
          console.log('big order to balance btc avail', bigOrder,);
        }
        await robot.updateFunds(user.id);
      }

      // put each trade into the db as a reorder so the sync loop can sync the right amount
      for (let i = 0; i < setup.orderList.length; i++) {
        const order = setup.orderList[i];

        const tradeDetails = {
          original_sell_price: JSON.stringify(Number(order.original_sell_price)),
          original_buy_price: JSON.stringify(Number(order.original_buy_price)),
          side: order.side,
          limit_price: JSON.stringify(Number(order.limit_price)), // USD
          base_size: JSON.stringify(Number(order.base_size)), // BTC
          product_id: order.product_id,
          total_fees: order.previous_total_fees,
          // stp: 'cn',
          userID: user.id,
          trade_pair_ratio: Number(options.trade_pair_ratio),
          client_order_id: uuidv4()
        };

        let fakeOrder = {
          order_id: uuidv4(),
          product_id: order.product_id,
          // user_id: '9f732868-9790-5667-b29a-f6eb8ab97966',
          order_configuration: {
            limit_limit_gtc: {
              base_size: JSON.stringify(Number(order.base_size)),
              limit_price: JSON.stringify(Number(order.limit_price)),
              post_only: false
            }
          },
          side: order.side,
          client_order_id: uuidv4(),
          status: 'PENDING',
          time_in_force: 'GOOD_UNTIL_CANCELLED',
          created_time: new Date(),
          completion_percentage: '0',
          filled_size: '0',
          average_filled_price: '0',
          fee: '',
          number_of_fills: '0',
          filled_value: '0',
          pending_cancel: false,
          size_in_quote: false,
          total_fees: '0',
          size_inclusive_of_fees: false,
          total_value_after_fees: '0',
          trigger_status: 'INVALID_ORDER_TYPE',
          order_type: 'LIMIT',
          reject_reason: 'REJECT_REASON_UNSPECIFIED',
          settled: false,
          product_type: 'SPOT',
          reject_message: '',
          cancel_message: '',
          reorder: true
        }
        // console.log('order to store', fakeOrder);
        await databaseClient.storeTrade(fakeOrder, tradeDetails, fakeOrder.created_time);
        // await databaseClient.storeTrade(order, order, time);
      }
      // tell DOM to update orders
      messenger[user.id].newMessage({
        type: 'general',
        text: `Auto setup complete!`,
        orderUpdate: true
      });
    } catch (err) {
      console.log(err, 'problem in autoSetup ');
      messenger[user.id].newError({
        errorData: err,
        errorText: `problem in auto setup`
      });
    }
    res.sendStatus(200);
  } else {
    console.log('user is not active and cannot trade!');
    res.sendStatus(404)
  }
});


/**
* SYNC route to sync an individual trade with coinbase
  this will just delete it and the bot will replace it on the full sync loop
*/
router.put('/', rejectUnauthenticated, async (req, res) => {
  // sync route code here
  const userID = req.user.id;
  const orderId = req.body.order_id;

  try {
    await cbClients[userID].cancelOrders([orderId]);
    await databaseClient.updateTrade({ reorder: true, order_id: orderId })
    res.sendStatus(200);

  } catch (error) {
    if (error.data?.message) {
      console.log('error message, trade router sync:', error.data.message);
      // orders that have been canceled are deleted from coinbase and return a 404.
      if (error.data.message === 'order not found') {
        await databaseClient.setSingleReorder(orderId);
        console.log('order not found in account', orderId);
        res.sendStatus(400)
      }
    }
    if (error.response?.status === 404) {
      console.log('order not found in account', orderId);
      res.sendStatus(400)
    } else {
      console.log('something failed in the sync trade route', error);
      res.sendStatus(500)
    }
  };
});

/**
 * POST route to run a simulation of a setup
 * this will not save the trades to the database
 * this will not place any orders
 * this will not update the funds
 * this will not update the orders
 * this will not do anything but return the results of a simulation
 */
router.post('/simulation', rejectUnauthenticated, async (req, res) => {
  try {
    // check if user is already running a simulation
    if (userStorage[req.user.id].simulating) {
      console.log('user is already simulating');
      res.sendStatus(400);
      return;
    }
    // set user to simulating
    userStorage[req.user.id].simulating = true;

    // clear out any previous simulation results
    userStorage[req.user.id].simulationResults = null;

    // tell client to update user
    messenger[req.user.id].userUpdate();

    const user = req.user;

    const funds = userStorage[user.id].getAvailableFunds();
    user.availableFunds = funds;

    // console.log('simulation route hit', userStorage[req.user.id]);

    const workerData = {
      user: user,
      options: req.body
    }

    // res.sendStatus(200);

    // start a child process to run the simulation
    // get the path
    const path = __dirname;
    console.log('path', path);

    const simulationWorker = fork(path + '../../../src/workers/simulationWorker.js');
    simulationWorker.send(workerData);
    // when the worker sends a message back, send it to the client
    simulationWorker.on('message', (message) => {
      console.log('message from simulationWorker', message);

      if (!message.valid) {
        console.log('simulation was not valid');
        res.sendStatus(400);
        // set user to not simulating
        userStorage[req.user.id].simulating = false;
        // tell client to update user
        messenger[req.user.id].userUpdate();
        // kill the worker after it sends the message
        simulationWorker.kill();
        return;
      }

      messenger[req.user.id].newMessage({
        type: 'simulationResults',
        data: message
      });

      userStorage[req.user.id].simulationResults = message;

      res.send(message).status(200);
      // kill the worker after it sends the message
      simulationWorker.kill();
    });
    simulationWorker.on('exit', (code) => {
      console.log('simulationWorker exited');
      if (code !== 0) {
        console.log(`simulationWorker stopped with exit code ${code}`);
      }
      // set user to not simulating
      userStorage[req.user.id].simulating = false;
      // tell client to update user
      messenger[req.user.id].userUpdate();
    });
  } catch (error) {
    console.log('error in simulation route', error);
    res.sendStatus(500);
    // set user to not simulating
    userStorage[req.user.id].simulating = false;
    // tell client to update user
    messenger[req.user.id].userUpdate();
  }
});

/**
 * GET route to get the results of a simulation
 */
router.get('/simulation', rejectUnauthenticated, async (req, res) => {
  try {
    const userID = req.user.id;

    for (let i = 0; i < 20; i++) {
      const simulationResults = await userStorage[userID].simulationResults;
      if (simulationResults?.simResults) {
        console.log('simulation results', simulationResults);
        res.send(simulationResults).status(200);
        return;
      } else {
        console.log('simulation results', i);
        await sleep(1000);
      }
    }

    res.sendStatus(404);
  } catch (error) {
    console.log('error in simulation route', error);
    res.sendStatus(500);
  }
});



module.exports = router;