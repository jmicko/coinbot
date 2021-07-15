// const express = require('express');
const pool = require('./pool');
// const authedClient = require('./authedClient');

const storeTransaction = (req, res, next) => {

  // add new order to the database
  console.log('order was sent successfully, adding to db');
  console.log('pendingTrade details are:', req.pendingTrade);
  // console.log(TradeDetails);
  const newOrder = req.pendingTrade;
  const sqlText = `INSERT INTO "orders" 
                      ("id", "price", "size", "side", "settled") 
                      VALUES ($1, $2, $3, $4, $5);`;
  pool.query(sqlText, [newOrder.id, newOrder.price, newOrder.size, newOrder.side, newOrder.settled])
    // todo - not sure this is right. Should next be called inside then?
    // that way it waits to make sure the pool query worked before moving on.
    // but does this move on to the next middleware, and then come back at the end for the catch?
    // does this even need a catch? commenting out for now. 
    .then(
      next()
    )
  // .catch((error) => {
  //   console.log('SQL failed', error);
  //   res.sendStatus(500)
  // });
}

module.exports = storeTransaction;