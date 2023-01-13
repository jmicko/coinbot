import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext.js';
import { useUser } from '../../../contexts/UserContext.js';
import { useFetchData } from '../../../hooks/fetchData.js';
import './BulkDelete.css'


function BulkDelete(props) {
  const { user } = useUser();
  const { syncOrders, deleteRangeForProduct, deleteAll, productID } = useData();
  const { deleteData:deleteAllForProduct } = useFetchData(`/api/orders/product/${productID}`, { defaultState: {}, notNull: [productID], noLoad: true })

  const [lowerLimit, setLowerLimit] = useState(0);
  const [upperLimit, setUpperLimit] = useState(0);

  // delete the order if the abandon button is clicked.
  // the loop already detects deleted orders, so only need to make a call to coinbase
  // no need to bother the database if it is busy
  function deleteAllOrders() {
    // call the orders delete route
    deleteAll();
  }
  
  // delete all orders for a given product
  function deleteAllOrdersForProduct() {
    deleteAllForProduct();
  }

  function deleteRange() {
    deleteRangeForProduct([productID, lowerLimit, upperLimit])
  }


  return (
    <div className="BulkDelete settings-panel scrollable">

      {/* SYNC ALL TRADES */}
      <div className="divider" />
      <h4>Synchronize All Trades</h4>
      {props.tips && <p>
        This will delete all open orders from coinbase and replace them based on the trades stored in the
        database. It can sometimes fix issues that cause repeated errors, and may take a few minutes to complete.
      </p>}
      <button className={`btn-blue medium ${user.theme}`} onClick={syncOrders}>Sync All Trades</button>

      {/* DELETE RANGE */}
      <div className="divider" />
      <h4>Delete Range</h4>
      {props.tips && <p>
        Delete all trades that fall within a price range, inclusive of the numbers set. This is based on the current price,
        so if the trade is a buy, it will look at the buy price. If it is a sell, it will look at the sell price.
      </p>}
      <div className='left-border'>
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

        <button className={`btn-red medium ${user.theme}`} onClick={() => { deleteRange() }}>Delete Range For {productID}</button>
      </div>

      {/* DELETE ALL TRADES FOR CURRENT PRODUCT */}

      <div className="divider" />
      <h4>Delete All Trades for {productID}</h4>
      <p>Danger! This button will delete all your positions for {productID}! Press it carefully!</p>
      <button className={`btn-red medium ${user.theme}`} onClick={() => { deleteAllOrdersForProduct() }}>Delete All {productID}</button>


      {/* DELETE ALL TRADES */}
      <div className="divider" />
      <h4>Delete All Trades</h4>
      <p>Danger! This button will delete ALL your positions for ALL your products! Not just {productID}! Press it carefully!</p>
      <button className={`btn-red medium ${user.theme}`} onClick={() => { deleteAllOrders() }}>Delete All</button>

      <div className="divider" />
    </div>
  );
}

export default BulkDelete;