import React, { useCallback, useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Status.css'
import { useSocket } from "../../contexts/SocketProvider";
import CoinbasePro from 'coinbase-pro';
// add coinbase public client on the front end because it requires no auth, easier to set up,
// and makes client make those calls so less done on the server => easier to process the loop
const publicClient = new CoinbasePro.PublicClient();


function Status(props) {
  const dispatch = useDispatch();
  const [loopStatus, setLoopStatus] = useState("I count loops");
  const [localWebsocket, setLocalWebsocket] = useState("disconnected");
  const [cbWebsocket, setCbWebsocket] = useState("disconnected");
  const [connection, setConnection] = useState(false);
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
      // loop status updates get saved to own state
      if (message.loopStatus != null) {
        setLoopStatus(message.loopStatus);
        // getProfits();
      }
      message.connection?.localWebsocket
        ? setLocalWebsocket(message.connection.localWebsocket)
        : message.connection?.cbWebsocket
          ? setCbWebsocket(message.cbWebsocket)
          : console.log('connection message is not right');
      // connection status updates get saved to own state
      // if (message.connection != null) {
      //   setConnection({...message.connection})
      //   console.log(`++++++++++message:`, message.connection);
      // }
    });

    // this will remove the listener when component rerenders
    return () => socket.off('message')
    // useEffect will depend on socket because the connection will 
    // not be there right when the page loads
  }, [socket, getProfits]);

  // get the total number of open orders
  useEffect(() => {
    if (props.store.ordersReducer.openOrdersInOrder.sells !== undefined && props.store.ordersReducer.openOrdersInOrder.buys !== undefined) {
      setOpenOrderQuantity(props.store.ordersReducer.openOrdersInOrder.sells.length + props.store.ordersReducer.openOrdersInOrder.buys.length)
    }
  }, [props.store.ordersReducer.openOrdersInOrder.sells, props.store.ordersReducer.openOrdersInOrder.buys]);

  // to get price of bitcoin updated on dom
  function ticker(data) {
    publicClient.getProductTicker('BTC-USD', (error, response, data) => {
      if (error) {
        // handle the error
        console.log(error);
        setConnection(false)
      } else {
        setConnection(true)
        // save price
        dispatch({
          type: 'SET_TICKER_PRICE',
          payload: {
            tickerPrice: data.price
          }
        });
        // console.log('ticker', BTC_USD_price);
      }
    })
  }

  // calls the ticker at regular intervals
  useEffect(() => {
    const interval = setInterval(() => {
      ticker();
    }, 500);
    // need to clear on return or it will make dozens of calls per second
    return () => clearInterval(interval);
  }, []);

  return (

    <div className="Status boxed fit">
      <h3 className="title">
        Status
      </h3>
      {/* todo - maybe style in some divider lines here or something */}
      <p className="info"><strong>~~~ BTC-USD ~~~</strong></p>
      <p className="info">${props.store.statusReducer.tickerReducer.tickerPrice}/coin</p>
      <p className="info"><strong>~~~ Coinbot ~~~</strong></p>
      <p className="info">{(localWebsocket) ? 'Local WS Connected' : 'Local WS Problem'}</p>
      <p className="info">{(cbWebsocket) ? 'CB WS Connected' : 'CB WS Problem'}</p>
      <p className="info">{(connection) ? 'Ticker Connected' : 'Ticker Problem'}</p>
      <p className="info"><strong>~~~ The Loop ~~~</strong></p>
      <p className="info">{loopStatus} loop{loopStatus === 1 ? '' : 's'}, brother</p>
      <p className="info"><strong>~~~ Account ~~~</strong></p>
      <p className="info"><strong>Available Funds</strong><br />${Math.floor(props.store.accountReducer.accountReducer * 100) / 100}</p>
      <p className="info"><strong>Maker Fee</strong><br />{props.store.accountReducer.feeReducer.maker_fee_rate * 100}%</p>
      <p className="info"><strong>Taker Fee</strong><br />{props.store.accountReducer.feeReducer.taker_fee_rate * 100}%</p>
      <p className="info"><strong>30 Day Volume</strong><br />${props.store.accountReducer.feeReducer.usd_volume}</p>
      <p className="info"><strong>Total Profit*</strong><br />${Number(props.store.accountReducer.profitsReducer[0].sum)}</p>
      <p className="info"><strong>Total Open Orders</strong><br />{openOrderQuantity}</p>
      <p className="small">*Profit calculation is a work in progress, but this should be close</p>
      {/* .store.accountReducer.feeReducer */}
    </div>
  )
}

export default connect(mapStoreToProps)(Status);