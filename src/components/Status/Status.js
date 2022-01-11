import React, { useCallback, useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Status.css'
import { useSocket } from "../../contexts/SocketProvider";


function Status(props) {
  const dispatch = useDispatch();
  const [loopStatus, setLoopStatus] = useState(true);
  const [openOrderQuantity, setOpenOrderQuantity] = useState(0);

  const socket = useSocket();

  const getProfits = useCallback(
    () => {
      dispatch({
        type: 'FETCH_PROFITS'
      });
    }, [dispatch]
  )

  const getAccounts = useCallback(
    () => {
      dispatch({
        type: 'FETCH_ACCOUNT'
      });
    }, [dispatch]
  )

  // taken from https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // update profits when a trade is made
  useEffect(() => {
    getProfits();
    getAccounts();
    // make it depend on the order reducer because that will change when orders change.
    // profits are most likely to change when orders change, and do not change if they don't
  }, [props.store.ordersReducer.openOrdersInOrder, getProfits, getAccounts]);

  // need use effect to prevent multiplying connections every time component renders
  useEffect(() => {
    // socket may not exist on page load because it hasn't connected yet
    if (socket == null) return;

    socket.on('message', message => {
      // console.log('message from socket', message);
      if (message.heartbeat && message.userID === props.store.accountReducer.userReducer.id) {
        setLoopStatus(prevLoopStatus => {
          // console.log('previous error count', prevErrorCount);
          return !prevLoopStatus;
        });
      }
    });

    // this will remove the listener when component rerenders
    return () => socket.off('message')
    // useEffect will depend on socket because the connection will 
    // not be there right when the page loads
  }, [socket, props.store.accountReducer.userReducer.id]);

  // get the total number of open orders
  useEffect(() => {
    if (props.store.ordersReducer.openOrdersInOrder.sells !== undefined && props.store.ordersReducer.openOrdersInOrder.buys !== undefined) {
      setOpenOrderQuantity(props.store.ordersReducer.openOrdersInOrder.sells.length + props.store.ordersReducer.openOrdersInOrder.buys.length)
    }
  }, [props.store.ordersReducer.openOrdersInOrder.sells, props.store.ordersReducer.openOrdersInOrder.buys]);


  return (

    <div className="Status boxed fit">
      {/* todo - maybe style in some divider lines here or something */}
      {/* <p className="info status-ticker"><strong>~~~ user ~~~</strong><br />{JSON.stringify(props.store.accountReducer.userReducer)}</p> */}
      <p className="info status-ticker"><strong>~~~ BTC-USD ~~~</strong><br />${numberWithCommas(props.priceTicker)}/coin</p>
      <p className="info status-ticker"><strong>Available Funds</strong><br />${numberWithCommas(Math.floor(props.store.accountReducer.accountReducer * 100) / 100)}</p>
      <p className="info status-ticker"><strong>Maker Fee</strong><br />{Number((props.store.accountReducer.feeReducer.maker_fee_rate * 100).toFixed(2))}%</p>
      <p className="info status-ticker"><strong>Taker Fee</strong><br />{Number((props.store.accountReducer.feeReducer.taker_fee_rate * 100).toFixed(2))}%</p>
      <p className="info status-ticker"><strong>30 Day Volume</strong><br />${numberWithCommas(props.store.accountReducer.feeReducer.usd_volume)}</p>
      <p className="info status-ticker"><strong>Profit Estimate</strong><br />${numberWithCommas(Number(props.store.accountReducer.profitsReducer[0].sum).toFixed(2))}</p>
      <p className="info status-ticker"><strong>Total Open Orders</strong><br />{numberWithCommas(openOrderQuantity)}</p>
      <p className="info status-ticker">~~{loopStatus ? <strong>HEARTBEAT</strong> : <strong>heartbeat</strong>}~~</p>
    </div>
  )
}

export default connect(mapStoreToProps)(Status);