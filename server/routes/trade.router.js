import express from 'express';
const router = express.Router();
import { rejectUnauthenticated, } from '../modules/authentication-middleware.js';
import { databaseClient } from '../modules/databaseClient.js';
import { robot } from '../modules/robot.js';
import {  userStorage, cbClients, messenger } from '../modules/cache.js';
import {  devLog, sleep } from '../../src/shared.js';
import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * POST route sending basic market trade
 */
router.post('/market', rejectUnauthenticated, async (req, res) => {
  devLog('basic trade post route hit', req.body);
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
    devLog('BIG order', tradeDetails);

    try {
      // send the new order with the trade details
      let basic = await cbClients[userID].placeOrder(tradeDetails);
      devLog('basic trade results', basic,);

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
        devLog('Insufficient funds!');
      } else if (err.code && err.code === 'ETIMEDOUT') {
        devLog('Timed out');
      } else {
        devLog(err, 'problem in sending trade post route');
      }
      // send internal error status
      res.sendStatus(500);
    }
  } else {
    devLog('user is not active and cannot trade!');
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
      devLog('error message, trade router sync:', error.data.message);
      // orders that have been canceled are deleted from coinbase and return a 404.
      if (error.data.message === 'order not found') {
        await databaseClient.setSingleReorder(orderId);
        devLog('order not found in account', orderId);
        res.sendStatus(400)
      }
    }
    if (error.response?.status === 404) {
      devLog('order not found in account', orderId);
      res.sendStatus(400)
    } else {
      devLog('something failed in the sync trade route', error);
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
    devLog('simulation route hit', req.body);
    // check if user is already running a simulation
    if (userStorage[req.user.id].simulating) {
      devLog('user is already simulating');
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

    // devLog('simulation route hit', userStorage[req.user.id]);

    const workerData = {
      user: user,
      options: req.body
    }

    // res.sendStatus(200);

    // start a child process to run the simulation
    // get the path
    const path = __dirname;
    devLog('path', path);

    const simulationWorker = fork(path + '../../../src/workers/simulationWorker.js');
    simulationWorker.send(workerData);
    // when the worker sends a message back, send it to the client
    simulationWorker.on('message', (message) => {
      devLog('message from simulationWorker', message);

      if (!message.valid) {
        devLog('simulation was not valid');
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
      devLog('simulationWorker exited');
      if (code !== 0) {
        devLog(`simulationWorker stopped with exit code ${code}`);
      }
      // set user to not simulating
      userStorage[req.user.id].simulating = false;
      // tell client to update user
      messenger[req.user.id].userUpdate();
    });
  } catch (error) {
    devLog('error in simulation route', error);
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
        devLog('simulation results', simulationResults);
        res.send(simulationResults).status(200);
        return;
      } else {
        devLog('simulation results', i);
        await sleep(1000);
      }
    }

    res.sendStatus(404);
  } catch (error) {
    devLog('error in simulation route', error);
    res.sendStatus(500);
  }
});



export default router;