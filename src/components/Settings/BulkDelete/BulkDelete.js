import React, { useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './BulkDelete.css'


function BulkDelete(props) {
  const dispatch = useDispatch();

  const [lowerLimit, setLowerLimit] = useState(0);
  const [upperLimit, setUpperLimit] = useState(0);

  // delete the order if the abandon button is clicked.
  // the loop already detects deleted orders, so only need to make a call to coinbase
  // no need to bother the database if it is busy
  function deleteAllOrders() {
    // call the orders delete route
    dispatch({ type: 'DELETE_ALL_ORDERS' });
  }

  function deleteRange() {
    // call the orders delete route
    dispatch({
      type: 'DELETE_RANGE',
      payload: {
        lowerLimit: lowerLimit,
        upperLimit: upperLimit
      }
    });
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

      {/* DELETE RANGE */}
      <div className="divider" />
      <h4>Delete Range</h4>
      <p>Delete all trades that fall within a price range. This is based on the current price,
        so if the trade is a buy, it will look at the buy price. If it is a sell, it will look at the sell price.</p>

      <label htmlFor="upper_limit">
        Upper Limit:
      </label>
      <input
        type="number"
        name="upper_limit"
        value={upperLimit}
        required
        onChange={(event) => setUpperLimit(Number(event.target.value))}
      />

      <br />

      <label htmlFor="lower_limit">
        Lower Limit:
      </label>
      <input
        type="number"
        name="lower_limit"
        value={lowerLimit}
        required
        onChange={(event) => setLowerLimit(Number(event.target.value))}
      />

      <br />
      <br />

      <button className={`btn-red medium ${props.theme}`} onClick={() => { deleteRange() }}>Delete Range</button>

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