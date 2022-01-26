import React from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './BulkDelete.css'


function BulkDelete(props) {
  const dispatch = useDispatch();

  // delete the order if the abandon button is clicked.
  // the loop already detects deleted orders, so only need to make a call to coinbase
  // no need to bother the database if it is busy
  function deleteAllOrders() {
    // call the orders delete route
    dispatch({ type: 'DELETE_ALL_ORDERS' });
  }

  function resetProfit(event) {
    // event.preventDefault();
    dispatch({
      type: 'RESET_PROFIT',
    });
  }

  function deleteUser() {
    // setDeleting(true)
    dispatch({
      type: 'DELETE_USER', payload: {
        id: props.store.accountReducer.userReducer.id,
      }
    })
  }

  return (
    <div className="Reset">

      {/* SYNC ALL TRADES */}
      <div className="divider" />
      <h4>Synchronize All Trades</h4>
      <p>
        This will delete all open orders from coinbase and replace them based on the trades stored in the
        database. It can sometimes fix issues that cause repeated errors, and may take a few minutes to complete
      </p>
      <button className={`btn-blue medium ${props.theme}`} onClick={() => dispatch({ type: 'SYNC_ORDERS' })}>Sync All Trades</button>

      {/* DELETE ALL TRADES */}
      <div className="divider" />
      <h4>Delete All Trades</h4>
      <p>Danger! This button will delete all your positions! Press it carefully!</p>
      <button className={`btn-red medium ${props.theme}`} onClick={() => { deleteAllOrders() }}>Delete All</button>

      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(BulkDelete);