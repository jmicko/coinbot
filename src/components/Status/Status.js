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
  const [connection, setConnection] = useState("disconnected");
  const [BTC_USD_price, setBTC_USD_price] = useState("");

  const socket = useSocket();

  const getProfits = useCallback(
    () => {
      dispatch({
        type: 'FETCH_PROFITS'
      });
    }, [dispatch]
  )
  // need use effect to prevent multiplying connections every time component renders
  useEffect(() => {
    // socket may not exist on page load because it hasn't connected yet
    if (socket == null) return;


    socket.on('update', update => {
      // loop status updates get saved to own state
      if (update.loopStatus != null) {
        setLoopStatus(update.loopStatus);
        // getProfits();
      }
      // connection status updates get saved to own state
      if (update.connection != null) {
        setConnection(update.connection)
        // console.log(`message:`, message.loopStatus);
      }
    });

    // this will remove the listener when component rerenders
    return () => socket.off('update')
    // useEffect will depend on socket because the connection will 
    // not be there right when the page loads
  }, [socket, getProfits]);

  // to get price of bitcoin updated on dom
  function ticker(data) {
    publicClient.getProductTicker('BTC-USD', (error, response, data) => {
      if (error) {
        // handle the error
        console.log(error);
        setConnection('Ticker broke')
      } else {
        setConnection('Connected!')
        // save price
        // todo - dispatch to store and give button to use current price in trade-pair
        setBTC_USD_price(data.price)
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
      <p className="info">${BTC_USD_price}/coin</p>
      <p className="info"><strong>~~~ Coinbot ~~~</strong></p>
      <p className="info">{connection}</p>
      <p className="info"><strong>~~~ The Loop ~~~</strong></p>
      <p className="info">{loopStatus}</p>
      <p className="info"><strong>~~~ Account ~~~</strong></p>
      <p className="info"><strong>Maker Fee</strong><br />{props.store.accountReducer.feeReducer.maker_fee_rate * 100}%</p>
      <p className="info"><strong>Taker Fee</strong><br />{props.store.accountReducer.feeReducer.taker_fee_rate * 100}%</p>
      <p className="info"><strong>30 Day Volume</strong><br />${props.store.accountReducer.feeReducer.usd_volume}</p>
      <p className="info"><strong>Total Profit*</strong><br />${Number(props.store.accountReducer.profitsReducer[0].sum)}</p>
      <p className="small">*Profit calculation is a work in progress, but this should be close</p>
      {/* .store.accountReducer.feeReducer */}
    </div>
  )
}

export default connect(mapStoreToProps)(Status);