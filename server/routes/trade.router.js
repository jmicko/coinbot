const express = require('express');
const router = express.Router();
const pool = require('../modules/pool');
const { rejectUnauthenticated, } = require('../modules/authentication-middleware');
const authedClient = require('../modules/authedClient');
const databaseClient = require('../modules/databaseClient');
const socketClient = require('../modules/socketClient');
const toggleCoinbot = require('../modules/toggleCoinbot');
const robot = require('../modules/robot');
const { cbWebsocketConnection } = require('../modules/robot');


// POST route for turning bot on and off
router.post('/toggle', rejectUnauthenticated, (req, res) => {
  // When this route is hit, it turns on and off the trading loop
  toggleCoinbot();
  res.sendStatus(200);
})


/**
 * POST route sending trade
 */
router.post('/', rejectUnauthenticated, async (req, res) => {
  // POST route code here
  const order = req.body;
  order.isNew = true;
  // tradeDetails const should take in values sent from trade component form
  const tradeDetails = {
    isNew: true,
    original_sell_price: order.original_sell_price,
    original_buy_price: order.price,
    side: order.side,
    price: order.price, // USD
    size: order.size, // BTC
    product_id: order.product_id,
  };
  console.log('here is the new order to be sent', order);
  let result = await robot.addToTradeQueue(order);
  console.log('result of adding new trade to queue', result);
  res.sendStatus(200);
});

/**
* DELETE route
*/
router.delete('/', rejectUnauthenticated, async (req, res) => {
  // DELETE route code here
  const orderId = req.body.id;
  if (robot.cbWebsocketConnection) {
    console.log('there is a ws connection to cb', robot.cbWebsocketConnection, 'orderId:', orderId);
    try {

      await authedClient.cancelOrder(orderId)
      // .then(() => {
      res.sendStatus(200);
      console.log('cb ws will handle the cancellation');
      // })
    } catch (err) {
      if (err.data?.message === 'order not found') {
        // GET order from cb and check if settled.
        cbOrder = await authedClient.getOrder(orderId);
        // if order is settled, send it to the trader
        if (cbOrder?.settled) {
          // get all the details from the db
          const dbOrder = await databaseClient.getSingleTrade(orderId);
          console.log('this is the order you tried to delete but is settled:', dbOrder);
          console.log('DELETE route is sending this trade to the queue', {
            'id': cbOrder.id,
            'size': cbOrder.size,
            'price': cbOrder.price,
            'settled': cbOrder.settled
          });
          // send it to the tradeQueue
          await robot.addToTradeQueue(dbOrder);
          socketClient.emit('message', {
            error: `order was settled, cannot cancel, flipping instead. ${JSON.stringify(dbOrder)}`,
            message: `order was canceled on Coinbase`,
            orderUpdate: true
          });
          res.sendStatus(200);
        } else {
          console.log('order not found in account. deleting from db', orderId);
          const queryText = `DELETE from "orders" WHERE "id"=$1;`;
          pool.query(queryText, [orderId])
            .then(() => {
              console.log('exchange was tossed lmao');
              socketClient.emit('message', {
                message: `exchange was tossed out of the ol' databanks`,
                orderUpdate: true
              });
              res.sendStatus(200)
            })
            .catch((err) => {
              console.log('error in trade.router.js delete route', err);
              res.sendStatus(500)
            })
        }
      } else {
        console.log('error in the delete route when cb ws is connected:', err);
      }
    } finally {
      return;
    }
  } else {

    console.log('in the server trade DELETE route', req.body.id)
    authedClient.cancelOrder(orderId)
      .then(data => {
        console.log('order was deleted successfully from cb', data);
        const queryText = `DELETE from "orders" WHERE "id"=$1;`;
        pool.query(queryText, [data])
          .then(() => {
            socketClient.emit('message', {
              message: `order was tossed out of ol' databanks`,
              orderUpdate: true
            });
            console.log('deleted from db as well');
            res.sendStatus(200);
          })
      })
      .catch((error) => {
        if (error.data?.message) {
          console.log('error message, trade router DELETE:', error.data.message);
          // orders that have been canceled are deleted from coinbase and return a 404.
          // error handling should delete them from db and not worry about coinbase since there is no other way to delete
          // but also send one last delete message to Coinbase just in case it finds it again, but with no error checking
          if (error.data.message === 'order not found') {
            console.log('order not found in account. deleting from db', orderId);
            const queryText = `DELETE from "orders" WHERE "id"=$1;`;
            pool.query(queryText, [orderId])
              .then(() => {
                console.log('exchange was tossed lmao');
                socketClient.emit('message', {
                  message: `exchange was tossed out of the ol' databanks`,
                  orderUpdate: true
                });
                res.sendStatus(200)
              })
              .catch((error) => {
                console.log('error in trade.router.js delete route', error);
                res.sendStatus(500)
              })
          }
        } else {
          console.log('something failed', error);
          res.sendStatus(500)
        }
      });
  }
});



module.exports = router;
