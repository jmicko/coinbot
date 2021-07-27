import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import SingleTrade from '../SingleTrade/SingleTrade'
import { useSocket } from "../../contexts/SocketProvider";
import './TradeList.css'




function TradeList(props) {
  const dispatch = useDispatch();
  const socket = useSocket();

  // these will store mapped arrays as html so they can be used after page loads
  const [buys, setBuys] = useState(<></>);
  const [sells, setSells] = useState(<></>);

  // need to set up a listener to listen for messages from the exchange
  // and also grab them when page loads - function below grabs on load
  useEffect(() => {
    getOpenOrders();
  }, []);

  // this watches the store and maps arrays to html when it changes because can't map nothing
  useEffect(() => {
    if (props.store.ordersReducer.openOrdersInOrder.sells != undefined) {
      setSells(props.store.ordersReducer.openOrdersInOrder.sells.map((sell) => {
        return <SingleTrade key={sell.id} order={sell} />
      }))
    }
    if (props.store.ordersReducer.openOrdersInOrder.buys != undefined) {
      setBuys(props.store.ordersReducer.openOrdersInOrder.buys.map((sell) => {
        return <SingleTrade key={sell.id} order={sell} />
      }))
    }
  }, [props.store.ordersReducer.openOrdersInOrder.sells, props.store.ordersReducer.openOrdersInOrder.sells]);

  // need use effect to prevent multiplying connections every time component renders
  useEffect(() => {
    // socket may not exist on page load because it hasn't connected yet
    if (socket == null) return;


    socket.on('message', message => {
      // check if the message is an order update, meaning there is something to change on dom
      if (message.orderUpdate != null) {
        // do api call for all open orders
        getOpenOrders()
      }
    });
    // this will remove the listener when component rerenders
    return () => socket.off('update')
    // useEffect will depend on socket because the connection will 
    // not be there right when the page loads
  }, [socket])

  // when an exchange is made and stored, do a REST call to get all open orders
  function getOpenOrders() {
    console.log('dispatching to fetch orders');
    dispatch({ type: 'FETCH_ORDERS' });

  }

  // map the sell array on top and buy array on bottom

  return (
    <div className="TradeList">
      <div className="scrollable boxed">
      {/* <>{JSON.stringify(props.store.accountReducer)}</> */}
        {sells}
        <center><p>Robot goes here</p></center>
        {buys}
      </div>
    </div>
  )
}

export default connect(mapStoreToProps)(TradeList);