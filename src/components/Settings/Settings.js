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

    // dispatch a delete for each trade in the trade list. This way 
    // there is no need for yet anoother route

    props.store.ordersReducer.openOrdersInOrder.sells.forEach(order => {
      console.log('here is one order to delete', order.id);
      dispatch({
        type: 'DELETE_TRADE', payload: {
          id: order.id,
        }
      })
    });

    props.store.ordersReducer.openOrdersInOrder.buys.forEach(order => {
      console.log('here is one order to delete', order.id);
      dispatch({
        type: 'DELETE_TRADE', payload: {
          id: order.id,
        }
      })
    });


  }


  if (props.showSettings) {

    return (
      <div className="Settings">
        {/* <>{JSON.stringify(props)}</> */}
        <h2 className="settings-header">Settings</h2>
        <h4>Connection Method</h4>
        <p>
          REST is slower but more reliable. Websocket is faster and better for hundreds of open orders
          placed very close together, but is less reliable on bad
          internet connections. With Websocket, dropped messages are not recovered, and you should
          occasionally switch to REST to synchronize.
        </p>
        <button className="btn-blue">REST</button>
        <button className="btn-blue">Websocket</button>
        <h4>Delete All Trades</h4>
        <p>Danger! This button will delete all your positions! Press it carefully!</p>
        <button className="btn-blue" onClick={() => { deleteAllOrders() }}>Delete All</button>
        <p>Some settings or whatever</p>
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
