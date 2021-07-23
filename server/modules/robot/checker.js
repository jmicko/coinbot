const pool = require('../pool');
const authedClient = require('../authedClient');
const databaseClient = require('../databaseClient/databaseClient');
const socketClient = require('./socketClient');
const flipTrade = require('./flipTrade');
const botStatus = require('./botStatus');
const sleep = require('./sleep');


const checker = (ordersToCheck) => {
    // brother may I have some loops
    // the dbOrder object can be used throughout the loop to refer to the old order that may have settled
    for (const dbOrder of ordersToCheck) {
        // need to stop the loop if coinbot is off
        if (botStatus.toggle) {
            socketClient.sendCheckerUpdate(dbOrder);
            console.log('checking this', dbOrder);
            // wait for 1/10th of a second between each api call to prevent too many
            sleep(200)
            .then(() => {
                // send request to coinbase API to get status of a trade
                authedClient.getOrder(dbOrder.id)
                // now can refer to dbOrder as old status of trade and cbOrder as current status
                .then((cbOrder) => {
                    // if it has indeed settled, make the opposit trade and call it good
                    if (cbOrder.settled) {
                        // tell frontend it is settled
                        socketClient.sendCheckerUpdate(cbOrder);
                        // get the trade details for the new trade. Flip buy/sell and get new price
                        const tradeDetails = flipTrade(dbOrder, cbOrder);
                        // function to send the order with the CB API to CB and place the trade
                        authedClient.placeOrder(tradeDetails)
                        .then(pendingTrade => {
                            // after trade is placed, store the returned pending trade values in the database
                            databaseClient.storeTrade(pendingTrade)
                        })
                        .then(result => {
                            // after order succeeds, update settled in DB to be TRUE
                            const queryText = `UPDATE "orders" SET "settled" = NOT "settled", "done_at" = $1, "fill_fees" = $2,
                            "filled_size" = $3, "executed_value" = $4 WHERE "id"=$5;`;
                            pool.query(queryText, [
                                cbOrder.done_at,
                                cbOrder.fill_fees,
                                cbOrder.filled_size,
                                cbOrder.executed_value,
                                cbOrder.id
                            ])
                            .then((results) => {
                                console.log('order updated', results.command);
                                return true
                            })
                            .catch(error => {
                                if (error.message) {
                                    console.log(error.message);
                                } else {
                                    console.log('houston we have a problem in the loop', error);
                                }
                            })
                        })
                    } else {
                        return 'not settled';
                    }
                })
            })
                .catch((error) => {
                    if (error.data.message) {
                        console.log('error message, end of loop:', error.data.message);
                        // orders that have been canceled are deleted from coinbase and return a 404.
                        // error handling should delete them so they are not counted toward profits if simply marked settled
                        if (error.data.message === 'NotFound') {
                            console.log('try that again please');
                            const queryText = `DELETE from "orders" WHERE "id"=$1;`;
                            return pool.query(queryText, [dbOrder.id]);
                        }
                    } else {
                        console.log('yousa got a biiiig big problems', error);
                        // socket.emit('message', { message: 'big doo doo' });
                    }
                })
        }
    }
}

module.exports = checker;