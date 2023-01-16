import React, { useEffect, useState } from 'react';
import { useData } from '../../contexts/DataContext.js';
import { useSocket } from '../../contexts/SocketProvider.js';
import { useUser } from '../../contexts/UserContext.js';
import { numberWithCommas } from '../../shared.js';
import './Status.css'


function Status(props) {
  // console.log('rendering status');

  const { user, refreshUser, theme, btnColor } = useUser();
  const { tickers, heartbeat } = useSocket();
  const {
    socketStatus, coinbotSocket,
    orders, refreshOrders,
    productID, refreshProducts,
    profit, refreshProfit,
  } = useData();
  const openOrdersInOrder = orders;
  const [openSellsQuantity, setOpenSellsQuantity] = useState(0);
  const [openBuysQuantity, setOpenBuysQuantity] = useState(0);
  const [openOrderQuantity, setOpenOrderQuantity] = useState(0);
  const [profitDisplay, setProfitDisplay] = useState(0);
  const [availableFundsDisplay, setAvailableFundsDisplay] = useState(false);
  const [feeDisplay, setFeeDisplay] = useState(true);
  const [profitAccuracy, setProfitAccuracy] = useState(2);

  const updateUser = () => {
    refreshProfit();
    refreshOrders();
    refreshProducts();
    refreshUser();

    // dispatch({ type: 'FETCH_BOT_ERRORS' });
    // dispatch({ type: 'FETCH_BOT_MESSAGES' });
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
          {/* {JSON.stringify(profit[profitDisplay])} */}
          <strong>{profit[profitDisplay]?.duration} Profit</strong>
          <br />
          ${numberWithCommas(Number(profit[profitDisplay]?.productProfit).toFixed(profitAccuracy))} /
          ${numberWithCommas(Number(profit[profitDisplay]?.allProfit).toFixed(profitAccuracy))}
        </p>
        }
      </center>

      <center>
        <p className="info status-ticker">
          <strong>{productID} Price</strong>
          <br />
          {Number(tickers?.[productID]?.price)
            .toFixed(Number(user.availableFunds?.[productID]?.quote_increment.split('1')[0].length - 1))
            // .toFixed(2)
          }
        </p>
      </center>

      <center onClick={() => { setAvailableFundsDisplay(!availableFundsDisplay) }}>
        {/* {JSON.stringify(user.availableFunds[productID])} */}
        {availableFundsDisplay
          ? <p className="info status-ticker">
            <strong>Available Funds</strong>
            <br />
            {/* {JSON.stringify((user.availableFunds[productID].base_increment.split('1')[0].length - 1))} */}
            {numberWithCommas(Number(user.availableFunds?.[productID]?.base_available)
              .toFixed(Number(user.availableFunds?.[productID]?.base_increment.split('1')[0].length - 1)))} {user.availableFunds?.[productID]?.base_currency}
          </p>
          : <p className="info status-ticker">
            <strong>Available Funds</strong>
            <br />
            {user.availableFunds?.[productID]?.quote_currency === 'USD' && "$"}{numberWithCommas(Number(user.availableFunds?.[productID]?.quote_available)
              .toFixed(Number(user.availableFunds?.[productID]?.quote_increment.split('1')[0].length - 1)))} {user.availableFunds?.[productID]?.quote_currency !== 'USD' && user.availableFunds?.[productID]?.quote_currency}
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
        <p className={`info status-ticker ${theme} ${heartbeat?.count === 0 && 'blue'}`}>
          <strong>
            <span className={`${coinbotSocket} ${theme}`}>&#x2022;</span>
            {heartbeat?.heart}{heartbeat?.beat}
            <span className={`${socketStatus} ${theme}`}>&#x2022;</span>
          </strong>
          <br />
          <button className={`${btnColor} ${theme}`} onClick={updateUser}>Refresh</button>
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