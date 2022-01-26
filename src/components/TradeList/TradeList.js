import React, { useEffect, useState, useCallback } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import SingleTrade from '../SingleTrade/SingleTrade'
import { useSocket } from "../../contexts/SocketProvider";
import coinbotFilled from "../../../src/coinbotFilled.png";
// import coinbotFilledGif from "../../../src/coinbotFilled.gif";
import './TradeList.css'




function TradeList(props) {
  const dispatch = useDispatch();
  const socket = useSocket();

  // these will store mapped arrays as html so they can be used after page loads
  const [buys, setBuys] = useState(<></>);
  const [sells, setSells] = useState(<></>);
  const [highestBuy, setHighestBuy] = useState(0);
  const [lowestSell, setLowestSell] = useState(0);


  // when an exchange is made and stored, do a REST call to get all open orders
  const getOpenOrders = useCallback(
    () => {
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
      setLowestSell(Number(props.store.ordersReducer.openOrdersInOrder.sells[0]?.price || 0))
      setSells(props.store.ordersReducer.openOrdersInOrder.sells.reverse().map((sell) => {
        return <SingleTrade key={sell.id} order={sell} theme={props.theme} />
      }))
    }
    if (props.store.ordersReducer.openOrdersInOrder.buys !== undefined) {
      setHighestBuy(Number(props.store.ordersReducer.openOrdersInOrder.buys[0]?.price || 0))
      setBuys(props.store.ordersReducer.openOrdersInOrder.buys.map((sell) => {
        return <SingleTrade key={sell.id} order={sell} theme={props.theme} />
      }))
    }
  }, [props.store.ordersReducer.openOrdersInOrder.sells, props.store.ordersReducer.openOrdersInOrder.buys]);

  // need use effect to prevent multiplying connections every time component renders
  useEffect(() => {
    // socket may not exist on page load because it hasn't connected yet
    if (socket == null) return;


    socket.on('message', update => {
      // check if the update is an order update, meaning there is something to change on dom
      if ((update.orderUpdate != null) && (update.userID === props.store.accountReducer.userReducer.id)) {
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
    // <div className="TradeList">
    <div className="TradeList scrollable boxed">
      {/* <div className="scrollable boxed"> */}
      {/* <>{JSON.stringify(props.store.accountReducer)}</> */}
      {sells}
      <div className='robot'>
        {/* <p>to sell {props.priceTicker} {JSON.stringify(lowestSell)}</p> */}
        {lowestSell != 0 && highestBuy != 0 && <p>To Sell &#9650; ${(lowestSell - props.priceTicker).toFixed(2)}<br/>
        To Buy &nbsp;&#9660; ${(props.priceTicker - highestBuy).toFixed(2)}</p>}
        <img className="coinbot-image" src={coinbotFilled} alt="coinbot" />
        {lowestSell != 0 && highestBuy != 0 && <p>Margin: ${(lowestSell - highestBuy).toFixed(2)}</p>}
      </div>
      {buys}
      {/* </div> */}
    </div>
  )
}

export default connect(mapStoreToProps)(TradeList);