import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useData } from '../../contexts/DataContext';
import { useSocket } from '../../contexts/SocketProvider';
import { useUser } from '../../contexts/UserContext';
import { numberWithCommas } from '../../shared';
import './Status.css'


function Status(props) {
  const dispatch = useDispatch();
  const { user } = useUser();
  const socket = useSocket();
  const profitsReducer = useSelector((store) => store.accountReducer.profitsReducer);
  const {orders} = useData();
  const openOrdersInOrder = orders;
  const [openSellsQuantity, setOpenSellsQuantity] = useState(0);
  const [openBuysQuantity, setOpenBuysQuantity] = useState(0);
  const [openOrderQuantity, setOpenOrderQuantity] = useState(0);
  const [profitDisplay, setProfitDisplay] = useState(0);
  const [availableFundsDisplay, setAvailableFundsDisplay] = useState(false);
  const [feeDisplay, setFeeDisplay] = useState(true);
  const [profitAccuracy, setProfitAccuracy] = useState(2);

  // const [availableFundsUSD, setAvailableFundsUSD] = useState(0);
  // const [availableFundsBTC, setAvailableFundsBTC] = useState(0);

  const updateUser = () => {
    dispatch({
      type: 'FETCH_PROFITS',
      // send current product to fetch profits for
      payload: { product: props.product }
    });
    dispatch({ type: 'FETCH_ACCOUNT' });

    dispatch({
      type: 'FETCH_ORDERS',
      payload: { product: props.product }
    });
    dispatch({ type: 'FETCH_USER' });
    dispatch({ type: 'FETCH_BOT_ERRORS' });
    dispatch({ type: 'FETCH_BOT_MESSAGES' });
    dispatch({ type: 'FETCH_PRODUCTS' });
  }

  // watch to see if accuracy changes
  useEffect(() => {
    setProfitAccuracy(Number(user.profit_accuracy));
  }, [user.profit_accuracy])


  // get the total number of open orders
  useEffect(() => {
    if (openOrdersInOrder.sells !== undefined && openOrdersInOrder.buys !== undefined) {
      setOpenOrderQuantity(openOrdersInOrder.counts.totalOpenOrders.count)
      setOpenSellsQuantity(openOrdersInOrder.counts.totalOpenSells.count)
      setOpenBuysQuantity(openOrdersInOrder.counts.totalOpenBuys.count)
    }
  }, [openOrdersInOrder.counts, openOrdersInOrder.sells, openOrdersInOrder.buys]);

  useEffect(() => {
    if (profitDisplay > 4) {
      setProfitDisplay(0)
    };
  }, [profitDisplay]);


  return (

    <div className="Status boxed fit">
      {/* todo - maybe style in some divider lines here or something */}
      <center onClick={() => { setProfitDisplay(profitDisplay + 1) }}>
        {<p className="info status-ticker">
          {/* {JSON.stringify(profitsReducer[profitDisplay])} */}
          <strong>{profitsReducer[profitDisplay]?.duration} Profit</strong>
          <br />
          ${numberWithCommas(Number(profitsReducer[profitDisplay]?.productProfit).toFixed(profitAccuracy))} /
          ${numberWithCommas(Number(profitsReducer[profitDisplay]?.allProfit).toFixed(profitAccuracy))}
        </p>
        }
      </center>

      <center>
        <p className="info status-ticker">
          <strong>{props.product} Price</strong>
          <br />
          {Number(socket.tickers[props.product]?.price)
            .toFixed(Number(user.availableFunds?.[props.product]?.quote_increment.split('1')[0].length - 1))
            // .toFixed(2)
          }
        </p>
      </center>

      <center onClick={() => { setAvailableFundsDisplay(!availableFundsDisplay) }}>
        {/* {JSON.stringify(user.availableFunds[props.product])} */}
        {availableFundsDisplay
          ? <p className="info status-ticker">
            <strong>Available Funds</strong>
            <br />
            {/* {JSON.stringify((user.availableFunds[props.product].base_increment.split('1')[0].length - 1))} */}
            {numberWithCommas(Number(user.availableFunds?.[props.product]?.base_available)
              .toFixed(Number(user.availableFunds?.[props.product]?.base_increment.split('1')[0].length - 1)))} {user.availableFunds?.[props.product]?.base_currency}
          </p>
          : <p className="info status-ticker">
            <strong>Available Funds</strong>
            <br />
            {user.availableFunds?.[props.product]?.quote_currency === 'USD' && "$"}{numberWithCommas(Number(user.availableFunds?.[props.product]?.quote_available)
              .toFixed(Number(user.availableFunds?.[props.product]?.quote_increment.split('1')[0].length - 1)))} {user.availableFunds?.[props.product]?.quote_currency !== 'USD' && user.availableFunds?.[props.product]?.quote_currency}
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
          <strong>Open Order Counts</strong>
          <br />
          <strong>B:</strong>{numberWithCommas(openBuysQuantity)} <strong>S:</strong>{numberWithCommas(openSellsQuantity)} <strong>T:</strong>{numberWithCommas(openOrderQuantity)}
        </p>
      </center>

      <center>
        <p className={`info status-ticker ${user.theme} ${socket.heartbeat.count === 0 && 'blue'}`}>
          <strong>{socket.heartbeat.heart}{socket.heartbeat.beat}<span className={socket.socketStatus}>&#x2022;</span></strong>
          <br />
          <button className={`btn-blue ${user.theme}`} onClick={updateUser}>Refresh</button>
        </p>
      </center>

      {/* <center> */}
      <p className="info status-ticker auto-scroll"><strong>Scroll</strong>
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