import React from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Settings.css'



function Settings(props) {
  const dispatch = useDispatch();


  // delete the order if the abandon button is clicked.
  // the loop already detects deleted orders, so only need to make a call to coinbase
  // no need to bother the database if it is busy
  function deleteAllOrders() {
    console.log('clicked delete', props.store.ordersReducer.openOrdersInOrder);
    // call the orders delete route
    dispatch({ type: 'DELETE_ALL_ORDERS' });
  }


  if (props.showSettings) {

    return (
      <div className="Settings">
        {/* <>{JSON.stringify(props)}</> */}
        <button className="btn-logout btn-red" onClick={() => {props.clickSettings()}}>X</button>
        <h2 className="settings-header">Settings</h2>
        {/* <h4>Connection Method</h4>
        <p>
          REST is slower but more reliable. Websocket is faster and better for hundreds of open orders
          placed very close together, but is less reliable on bad
          internet connections. With Websocket, dropped messages are not recovered, and you should
          occasionally switch to REST to synchronize.
        </p>
        <button className="btn-blue">REST</button>
        <button className="btn-blue">Websocket</button> */}
        <h4>Delete All Trades</h4>
        <p>Danger! This button will delete all your positions! Press it carefully!</p>
        <button className="btn-blue" onClick={() => { deleteAllOrders() }}>Delete All</button>
        <h4>Synchronize All Trades</h4>
        <p>
          This will delete all open orders from coinbase and replace them based on the trades stored in the
          database. It can sometimes fix issues that cause repeated errors, and may take a few minutes to complete
        </p>
        <button className="btn-logout btn-blue" onClick={() => dispatch({ type: 'SYNC_ORDERS' })}>Sync All Trades</button>
        <p>Some settings or whatever</p>
        <p>Some settings or whatever</p>
        <p>Some settings or whatever</p>
      </div>
    );
  } else {
    return (
      <></>
    );
  }
}

export default connect(mapStoreToProps)(Settings);
