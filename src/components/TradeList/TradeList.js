import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import SingleTrade from '../SingleTrade/SingleTrade'
import { useSocket } from "../../contexts/SocketProvider";
import './TradeList.css'




function TradeList() {
  const dispatch = useDispatch();
  const socket = useSocket();

  // not sure if orders should be stored in local state or redux but here's this
  const [buys, setBuys] = useState([]);
  const [sells, setSells] = useState([]);

  // need to set up a listener to listen for messages from the exchange

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

  // orders should be selected as two arrays, one for buys and one for sells. Order buy price, highest at top.

  // store arrays in the redux store maybe?

  // map the sell array on top and buy array on bottom



  return (
    <div className="TradeList">
      <div className="scrollable boxed">
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <SingleTrade side='sell' />
        <center><p>Robot goes here</p></center>
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />
        <SingleTrade side='buy' />

      </div>
    </div>
  )
}

export default TradeList;