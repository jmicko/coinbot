import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from '../../contexts/SocketProvider';
import './Status.css'


function Status(props) {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const ticker = useSelector((store) => store.statusReducer.tickers);
  const socket = useSocket();
  const heartBeat = useSelector((store) => store.statusReducer.heartBeat);
  const profitsReducer = useSelector((store) => store.accountReducer.profitsReducer);
  const openOrdersInOrder = useSelector((store) => store.ordersReducer.openOrdersInOrder);
  const [loopStatus, setLoopStatus] = useState(true);
  const [openSellsQuantity, setOpenSellsQuantity] = useState(0);
  const [openBuysQuantity, setOpenBuysQuantity] = useState(0);
  const [openOrderQuantity, setOpenOrderQuantity] = useState(0);
  const [profitDisplay, setProfitDisplay] = useState(1);
  const [availableFundsDisplay, setAvailableFundsDisplay] = useState(false);
  const [feeDisplay, setFeeDisplay] = useState(true);
  const [profitAccuracy, setProfitAccuracy] = useState(2);

  // const [availableFundsUSD, setAvailableFundsUSD] = useState(0);
  // const [availableFundsBTC, setAvailableFundsBTC] = useState(0);

  const updateUser = () => {
    dispatch({ type: 'FETCH_PROFITS' });
    dispatch({ type: 'FETCH_ACCOUNT' });
    dispatch({ type: 'FETCH_ORDERS' });
    dispatch({ type: 'FETCH_USER' });
    dispatch({ type: 'FETCH_BOT_ERRORS' });
    dispatch({ type: 'FETCH_BOT_MESSAGES' });
  }

  // watch to see if accuracy changes
  useEffect(() => {
    setProfitAccuracy(Number(user.profit_accuracy));
  }, [user.profit_accuracy])

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

  useEffect(() => {
    setLoopStatus(prevLoopStatus => {
      return !prevLoopStatus;
    });
  }, [heartBeat]);

  // get the total number of open orders
  useEffect(() => {
    if (openOrdersInOrder.sells !== undefined && openOrdersInOrder.buys !== undefined) {
      setOpenOrderQuantity(openOrdersInOrder.counts.totalOpenOrders.count)
      setOpenSellsQuantity(openOrdersInOrder.counts.totalOpenSells.count)
      setOpenBuysQuantity(openOrdersInOrder.counts.totalOpenBuys.count)
    }
  }, [openOrdersInOrder.counts]);

  useEffect(() => {
    if (profitDisplay > 4) {
      setProfitDisplay(1)
    };
  }, [profitDisplay]);


  return (

    <div className="Status boxed fit">
      {/* todo - maybe style in some divider lines here or something */}
      <center onClick={() => { setProfitDisplay(profitDisplay + 1) }}>
        {profitDisplay === 1
          ? <p className="info status-ticker">
            <strong>24 hour Profit</strong>
            <br />
            ${numberWithCommas(Number(profitsReducer[0].sum).toFixed(profitAccuracy))}
          </p>
          : profitDisplay === 2
            ? <p className="info status-ticker">
              <strong>7 Day Profit</strong>
              <br />
              ${numberWithCommas(Number(profitsReducer[1]?.sum).toFixed(profitAccuracy))}
            </p>
            : profitDisplay === 3
              ? <p className="info status-ticker">
                <strong>30 Day Profit</strong>
                <br />
                ${numberWithCommas(Number(profitsReducer[2]?.sum).toFixed(profitAccuracy))}
              </p>
              : <p className="info status-ticker">
                <strong>Profit Since Reset</strong>
                <br />
                ${numberWithCommas(Number(profitsReducer[3]?.sum).toFixed(profitAccuracy))}
              </p>
        }
      </center>

      <center>
        <p className="info status-ticker">
          <strong> BTC-USD Price</strong>
          <br />
          {/* {JSON.stringify(ticker)} */}
          ${numberWithCommas(Number(socket.ticker.btc.price).toFixed(2))}
        </p>
      </center>

      <center onClick={() => { setAvailableFundsDisplay(!availableFundsDisplay) }}>
        {availableFundsDisplay
          ? <p className="info status-ticker">
            <strong>Available Funds</strong>
            <br />
            {numberWithCommas(Math.floor(user.actualavailable_btc * 100000000) / 100000000)} BTC
          </p>
          : <p className="info status-ticker">
            <strong>Available Funds</strong>
            <br />
            ${numberWithCommas(Math.floor(user.actualavailable_usd * 100) / 100)}
          </p>
        }
      </center>

      <center onClick={() => { setFeeDisplay(!feeDisplay) }}>
        {feeDisplay
          ? <p className="info status-ticker">
            <strong>Maker Fee</strong>
            <br />
            {Number((user.maker_fee * 100).toFixed(2))}%
          </p>
          : <p className="info status-ticker">
            <strong>Taker Fee</strong>
            <br />
            {Number((user.taker_fee * 100).toFixed(2))}%
          </p>
        }
      </center>

      <center>
        <p className="info status-ticker">
          <strong>30 Day Volume</strong>
          <br />
          ${numberWithCommas(Number(user.usd_volume).toFixed(2))}
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
        <p className={`info status-ticker ${user.theme} ${heartBeat === 1 && 'blue'}`}>{loopStatus ? <strong>HEARTBEAT</strong> : <strong>heartbeat</strong>}
          <br />
          <button className={`btn-blue ${user.theme}`} onClick={updateUser}>Refresh</button>
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
        {user.paused &&
          <strong className='red'>~~~PAUSED~~~</strong>
        }
      </p>
      {/* </center> */}
    </div>
  )
}

export default Status;