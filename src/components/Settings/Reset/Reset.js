import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './Reset.css'


function Reset(props) {
  const dispatch = useDispatch();

    // delete the order if the abandon button is clicked.
  // the loop already detects deleted orders, so only need to make a call to coinbase
  // no need to bother the database if it is busy
  function deleteAllOrders() {
    console.log('clicked delete', props.store.ordersReducer.openOrdersInOrder);
    // call the orders delete route
    dispatch({ type: 'DELETE_ALL_ORDERS' });
  }

  function resetProfit(event) {
    // event.preventDefault();
    console.log('resetting profit!');
    dispatch({
      type: 'RESET_PROFIT',
    });
  }
  
  return (
    <div className="Reset">
      <center>
        <p>Reset Settings Page</p>
      </center>

      <h4>Delete All Trades</h4>
        <p>Danger! This button will delete all your positions! Press it carefully!</p>
        <button className="btn-blue" onClick={() => { deleteAllOrders() }}>Delete All</button>


        {/* RESET PROFIT */}
        <h4>Reset Profit</h4>
        <p>This will start the profit calculation back at $0</p>
        <button className="btn-blue" onClick={() => { resetProfit() }}>Reset Profit</button>
        <h4>Synchronize All Trades</h4>
        <p>
          This will delete all open orders from coinbase and replace them based on the trades stored in the
          database. It can sometimes fix issues that cause repeated errors, and may take a few minutes to complete
        </p>
        <button className="btn-logout btn-blue" onClick={() => dispatch({ type: 'SYNC_ORDERS' })}>Sync All Trades</button>

    </div>
  );
}

export default connect(mapStoreToProps)(Reset);