const pool = require('../pool');
const authedClient = require('../authedClient');
const databaseClient = require('../databaseClient/databaseClient');
const socketClient = require('../socketClient');
const flipTrade = require('./flipTrade');
const robot = require('./robot');
const sleep = require('./sleep');


const exchange = async (dbOrder) => {
  // brother may I have some loops
  // for (const dbOrder of ordersToCheck) {
    // the dbOrder object can be used throughout the loop to refer to the old order that may have settled
    // wait for 1/10th of a second  to prevent too many api calls
    await sleep(100)
      .then(() => {
        // need to stop the loop if coinbot is off
        if (robot.looping) {
          // socketClient.sendCheckerUpdate(dbOrder);
          console.log('at the exchange with trade ID:', dbOrder.id);
          socketClient.emit('message', { message: `at the exchange with trade ID: ${dbOrder.id}` });
          // send request to coinbase API to get status of a trade
          return authedClient.getOrder(dbOrder.id)
            // ----- now can refer to dbOrder as old status of trade and cbOrder as current status
            .then((cbOrder) => {
              // if it has indeed settled, make the opposit trade and call it good
              if (cbOrder.settled) {
                // tell frontend it is settled
                // socketClient.sendCheckerUpdate(cbOrder);
                // get the trade details for the new trade. Flip buy/sell and get new price
                const tradeDetails = flipTrade(dbOrder, cbOrder);
                // function to send the order with the CB API to CB and place the trade
                return authedClient.placeOrder(tradeDetails)
                  .then(pendingTrade => {
                    // after trade is placed, store the returned pending trade values in the database
                    databaseClient.storeTrade(pendingTrade, dbOrder)
                      .then(() => {
                        // after order succeeds, update settled in DB to be TRUE and add settlement info
                        const queryText = `UPDATE "orders" SET "settled" = NOT "settled", "done_at" = $1, "fill_fees" = $2,
                                          "filled_size" = $3, "executed_value" = $4 WHERE "id"=$5;`;
                        return pool.query(queryText, [
                          cbOrder.done_at,
                          cbOrder.fill_fees,
                          cbOrder.filled_size,
                          cbOrder.executed_value,
                          cbOrder.id
                        ])
                          .then((results) => {
                            socketClient.emit('update', {
                              message: `an exchange was made`,
                              orderUpdate: true
                            });
                            // socketClient.emit('order', { message: `exchange was made and tossed into the ol' databanks` });
                            console.log('order flipped and updated in db', results.command);
                          })
                          .catch(error => {
                            if (error.message) {
                              console.log('error message from exchange', error.message);
                            } else {
                              console.log('houston we have a problem in the loop', error);
                            }
                          })
                      })
                  })
              }
            })
        }
      })
      .catch((error) => {
        if ((error.data !== undefined) && (error.data.message !== undefined)) {
          console.log('error message, end of loop:', error.data.message);
          // orders that have been canceled are deleted from coinbase and return a 404.
          // error handling should delete them so they are not counted toward profits if simply marked settled
          if (error.data.message === 'NotFound') {
            console.log('order not found in account. deleting from db');
            const queryText = `DELETE from "orders" WHERE "id"=$1;`;
            return pool.query(queryText, [dbOrder.id])
            .then(() => {
              socketClient.emit('update', {
                message: `exchange was tossed into the ol' databanks`,
                orderUpdate: true
              });
            })
          }
        } else {
          console.log('yousa got a biiiig big problems', error);
          // socket.emit('message', { message: 'big doo doo' });
        }
      })
  // };
  return 'complete'
}

module.exports = exchange;