import React, { useCallback, useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Status.css'
import { useSocket } from "../../contexts/SocketProvider";


function Status(props) {
  const dispatch = useDispatch();
  const [loopStatus, setLoopStatus] = useState(true);
  const [fullSync, setFullSync] = useState("");
  const [openSellsQuantity, setOpenSellsQuantity] = useState(0);
  const [openBuysQuantity, setOpenBuysQuantity] = useState(0);
  const [openOrderQuantity, setOpenOrderQuantity] = useState(0);
  const [profitDisplay, setProfitDisplay] = useState(1);
  const [availableFundsDisplay, setAvailableFundsDisplay] = useState(false);
  const [feeDisplay, setFeeDisplay] = useState(true);
  const [profitAccuracy, setProfitAccuracy] = useState(2);

  const [availableFundsUSD, setAvailableFundsUSD] = useState(0);
  const [availableFundsBTC, setAvailableFundsBTC] = useState(0);

  const socket = useSocket();

  const refresh = () => {
    props.updateUser();
  }

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
        type: 'FETCH_USER'
      });
    }, [dispatch]
  )

  // watch to see if accuracy changes
  useEffect(() => {
    setProfitAccuracy(Number(props.store.accountReducer.userReducer.profit_accuracy));
  }, [props.store.accountReducer.userReducer.profit_accuracy])

  // taken from https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  const numberWithCommas = (x) => {
    // this will work in safari once lookbehind is supported
    // return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
    // for now, use this
    if (x !== null) {

      let parts = x.toString().split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts.join(".");
    } else {
      return "null"
    }
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
        if (message.count === 1) {
          setFullSync('blue');
        } else {
          setFullSync('');
        }
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
      setOpenOrderQuantity(props.store.ordersReducer.openOrdersInOrder.counts.totalOpenOrders.count)
      setOpenSellsQuantity(props.store.ordersReducer.openOrdersInOrder.counts.totalOpenSells.count)
      setOpenBuysQuantity(props.store.ordersReducer.openOrdersInOrder.counts.totalOpenBuys.count)
    }
  }, [props.store.ordersReducer.openOrdersInOrder.counts]);

  useEffect(() => {
    if (props.store.accountReducer.userReducer) {
      setAvailableFundsUSD(props.store.accountReducer.userReducer.actualavailable_usd);
      setAvailableFundsBTC(props.store.accountReducer.userReducer.actualavailable_btc);
    }
  }, [props.store.accountReducer.userReducer]);

  useEffect(() => {
    if (profitDisplay > 4) {
      setProfitDisplay(1)
    };

  }, [profitDisplay]);



  return (

    <div className="Status boxed fit">
      {/* todo - maybe style in some divider lines here or something */}
      {/* <p className="info status-ticker"><strong>~~~ user ~~~</strong><br />{JSON.stringify(props.store.accountReducer.userReducer)}</p> */}
      {/* <p>{JSON.stringify(props.store.accountReducer.userReducer.botMaintenance)}</p> */}
      <center onClick={() => { setProfitDisplay(profitDisplay + 1) }}>
        {profitDisplay === 1
          ? <p className="info status-ticker">
            <strong>24 hour Profit</strong>
            <br />
            ${numberWithCommas(Number(props.store.accountReducer.profitsReducer[0].sum).toFixed(profitAccuracy))}
          </p>
          : profitDisplay === 2
            ? <p className="info status-ticker">
              <strong>7 Day Profit</strong>
              <br />
              ${numberWithCommas(Number(props.store.accountReducer.profitsReducer[1]?.sum).toFixed(profitAccuracy))}
            </p>
            : profitDisplay === 3
              ? <p className="info status-ticker">
                <strong>30 Day Profit</strong>
                <br />
                ${numberWithCommas(Number(props.store.accountReducer.profitsReducer[2]?.sum).toFixed(profitAccuracy))}
              </p>
              : <p className="info status-ticker">
                <strong>Profit Since Reset</strong>
                <br />
                ${numberWithCommas(Number(props.store.accountReducer.profitsReducer[3]?.sum).toFixed(profitAccuracy))}
              </p>
        }
      </center>

      <center>
        <p className="info status-ticker">
          <strong> BTC-USD Price</strong>
          <br />
          {}
          ${numberWithCommas(Number(props.priceTicker).toFixed(2))}
        </p>
      </center>

      <center onClick={() => { setAvailableFundsDisplay(!availableFundsDisplay) }}>
        {availableFundsDisplay
          ? <p className="info status-ticker">
            <strong>Available Funds</strong>
            <br />
            {numberWithCommas(Math.floor(availableFundsBTC * 100000000) / 100000000)} BTC
          </p>
          : <p className="info status-ticker">
            <strong>Available Funds</strong>
            <br />
            ${numberWithCommas(Math.floor(availableFundsUSD * 100) / 100)}
          </p>
        }
      </center>

      <center onClick={() => { setFeeDisplay(!feeDisplay) }}>
        {feeDisplay
          ? <p className="info status-ticker">
            <strong>Maker Fee</strong>
            <br />
            {Number((props.store.accountReducer.userReducer.maker_fee * 100).toFixed(2))}%
          </p>
          : <p className="info status-ticker">
            <strong>Taker Fee</strong>
            <br />
            {Number((props.store.accountReducer.userReducer.taker_fee * 100).toFixed(2))}%
          </p>
        }
      </center>

      <center>
        <p className="info status-ticker">
          <strong>30 Day Volume</strong>
          <br />
          ${numberWithCommas(Number(props.store.accountReducer.userReducer.usd_volume).toFixed(2))}
        </p>
      </center>


      <center>
        <p className="info status-ticker">
          <strong>Total Open Orders</strong>
          <br />
          <strong>B:</strong>{numberWithCommas(openBuysQuantity)} <strong>S:</strong>{numberWithCommas(openSellsQuantity)} <strong>T:</strong>{numberWithCommas(openOrderQuantity)}
        </p>
      </center>

      <center>
        <p className={`info status-ticker ${props.theme} ${fullSync}`}>{loopStatus ? <strong>HEARTBEAT</strong> : <strong>heartbeat</strong>}
          <br />
          <button className={`btn-blue ${props.theme}`} onClick={refresh}>Refresh</button>
        </p>
      </center>

      {/* <center> */}
      <p className="info status-ticker auto-scroll"><strong>Auto Scroll</strong>
        {/* <br /> */}
        <input
          type="checkbox"
          checked={props.isAutoScroll}
          onChange={props.handleAutoScrollChange}
        />
        <br />
        {props.store.accountReducer.userReducer.paused &&
          <strong className='red'>~~~PAUSED~~~</strong>
        }
      </p>
      {/* </center> */}
    </div>
  )
}

export default connect(mapStoreToProps)(Status);