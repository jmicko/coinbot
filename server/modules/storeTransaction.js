// const express = require('express');
const pool = require('./pool');
// const authedClient = require('./authedClient');

// const stored = (pendingTrade) => {
//   return new Promise(resolve => stored(pendingTrade))
// }

const storeTransaction = (pendingTrade) => {
  // add new order to the database
  console.log('order was sent successfully, adding to db');
  const newOrder = pendingTrade;
  const sqlText = `INSERT INTO "orders" 
                  ("id", "price", "size", "side", "settled") 
                  VALUES ($1, $2, $3, $4, $5);`;
  // pretty sure noting is checking for errors here?
  // there is no catch, but when called from a .then followed by a .catch, errors are caught so whatever lol
  let stored = pool.query(sqlText, [newOrder.id, newOrder.price, newOrder.size, newOrder.side, newOrder.settled]);
  return stored;
}

module.exports = storeTransaction;