import React, { useEffect, useState, useCallback } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import SingleTrade from '../SingleTrade/SingleTrade'
import { useSocket } from "../../contexts/SocketProvider";
import coinbotFilled from "../../../src/coinbotFilled.png";
// import coinbotFilledGif from "../../../src/coinbotFilled.gif";
import './NotApproved.css'




function NotApproved(props) {
  const dispatch = useDispatch();
  const socket = useSocket();

  // these will store mapped arrays as html so they can be used after page loads
  const [buys, setBuys] = useState(<></>);
  const [sells, setSells] = useState(<></>);


  // when an exchange is made and stored, do a REST call to get all open orders
  const getOpenOrders = useCallback(
    () => {
      console.log('dispatching to fetch orders');
      dispatch({ type: 'FETCH_ORDERS' });
    }, [dispatch]
  )

  // need to set up a listener to listen for messages from the exchange
  // and also grab them when page loads - function below grabs on load
  useEffect(() => {
    getOpenOrders();
  }, [getOpenOrders]);

  // this watches the store and maps arrays to html when it changes because can't map nothing
  useEffect(() => {
    if (props.store.ordersReducer.openOrdersInOrder.sells !== undefined) {
      setSells(props.store.ordersReducer.openOrdersInOrder.sells.map((sell) => {
        return <SingleTrade key={sell.id} order={sell} />
      }))
    }
    if (props.store.ordersReducer.openOrdersInOrder.buys !== undefined) {
      setBuys(props.store.ordersReducer.openOrdersInOrder.buys.map((sell) => {
        return <SingleTrade key={sell.id} order={sell} />
      }))
    }
  }, [props.store.ordersReducer.openOrdersInOrder.sells, props.store.ordersReducer.openOrdersInOrder.buys]);

  // need use effect to prevent multiplying connections every time component renders
  useEffect(() => {
    // socket may not exist on page load because it hasn't connected yet
    if (socket == null) return;


    socket.on('message', update => {
      // check if the update is an order update, meaning there is something to change on dom
      if (update.orderUpdate != null) {
        // do api call for all open orders
        getOpenOrders()
      }
    });
    // this will remove the listener when component rerenders
    return () => socket.off('message')
    // useEffect will depend on socket because the connection will 
    // not be there right when the page loads
  }, [socket, getOpenOrders])

  // map the sell array on top and buy array on bottom

  return (
    <div className="NotApproved">
      <div className="scrollable boxed">
        {/* <>{JSON.stringify(props.store.accountReducer)}</> */}
        {sells}
        <center><p>Welcome to coinbot, {props.store.accountReducer.userReducer.username}!</p></center>
        <center><p>You are not approved yet.</p></center>
        <center><p>An admin must approve you first. For now, go ahead and Make sure you store your
          API details from Coinbase Pro. You can do this in the settings. As soon as you are approved,
          the coinbot will be here to greet you. Once you've been approved and have stored your API
          details, you will be able to trade the coin.</p></center>
        <center><p>Good Luck!</p></center>
        {buys}
      </div>
    </div>
  )
}

export default connect(mapStoreToProps)(NotApproved);