import React, { useEffect, useState } from 'react';
import { useData } from '../../contexts/DataContext.js';
import { useSocket } from '../../contexts/SocketProvider.js';
import { useUser } from '../../contexts/UserContext.js';
import useLocalStorage from '../../hooks/useLocalStorage.js';
import useWindowDimensions from '../../hooks/useWindowDimensions.js';
import { numberWithCommas } from '../../shared.js';
import './Status.css'


function Status(props) {
  // devLog('rendering status');

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
  // const [profitDisplay, setProfitDisplay] = useState(0);
  const [profitDisplay, setProfitDisplay] = useLocalStorage('profitDisplay', 0);
  // const [availableFundsDisplay, setAvailableFundsDisplay] = useState(false);
  const [availableFundsDisplay, setAvailableFundsDisplay] = useLocalStorage('availableFundsDisplay', false);
  // const [feeDisplay, setFeeDisplay] = useState(true);
  const [feeDisplay, setFeeDisplay] = useLocalStorage('feeDisplay', true);
  // const [profitAccuracy, setProfitAccuracy] = useState(2);
  const profitAccuracy = user.profit_accuracy;

  const { width } = useWindowDimensions();


  const updateUser = () => {
    refreshProfit();
    refreshOrders();
    refreshProducts();
    refreshUser();
  }

  // watch to see if accuracy changes
  // useEffect(() => {
  //   setProfitAccuracy(Number(user.profit_accuracy));
  // }, [user.profit_accuracy])


  // get the total number of open orders
  useEffect(() => {
    if (openOrdersInOrder.sells !== undefined && openOrdersInOrder.buys !== undefined) {
      setOpenOrderQuantity(openOrdersInOrder.counts.totalOpenOrders.count)
      setOpenSellsQuantity(openOrdersInOrder.counts.totalOpenSells.count)
      setOpenBuysQuantity(openOrdersInOrder.counts.totalOpenBuys.count)
    }
  }, [openOrdersInOrder.counts, openOrdersInOrder.sells, openOrdersInOrder.buys]);

  return (

    <div className="Status boxed fit">


      {/* <div onClick={() => { setProfitDisplay(profitDisplay >= (profit.length - 1) ? 0 : profitDisplay + 1) }}>
        {<div className="info status-ticker">
          <strong>{profit[profitDisplay]?.duration} Profit</strong>
          {width > 800 ? <br /> : <div className='spacer' />}
          ${numberWithCommas(Number(profit[profitDisplay]?.productProfit).toFixed(profitAccuracy))} /
          ${numberWithCommas(Number(profit[profitDisplay]?.allProfit).toFixed(profitAccuracy))}
        </div>
        }
      </div> */}
      {/* let's use a select dropdown instead of a strong, and get rid of the onClick behavior */}
      <div className="info status-ticker">
        <select
          value={profitDisplay}
          onChange={(e) => { setProfitDisplay(e.target.value) }}
        >
          {profit.map((p, i) => {
            return (
              <option key={i} value={i}>{p.duration} {p.duration !== 'Since Reset' && 'Profit'}</option>
            )
          })}
        </select>
        {width > 800 ? <br /> : <div className='spacer' />}
        ${numberWithCommas(Number(profit[profitDisplay]?.productProfit).toFixed(profitAccuracy))} /
        ${numberWithCommas(Number(profit[profitDisplay]?.allProfit).toFixed(profitAccuracy))}
      </div>

      <div className="info status-ticker">
        <strong>{productID} Price</strong>
        {width > 800 ? <br /> : <div className='spacer' />}
        {Number(tickers?.[productID]?.price)
          .toFixed(Number(user.availableFunds?.[productID]?.quote_increment.split('1')[0].length - 1))
          // .toFixed(2)
        }
      </div>


      {/* <div onClick={() => { setAvailableFundsDisplay(!availableFundsDisplay) }}>
        <div className="info status-ticker">
          <strong>Available Funds</strong>
          {width > 800 ? <br /> : <div className='spacer' />}
          {availableFundsDisplay
            ? `${numberWithCommas(Number(user.availableFunds?.[productID]?.base_available).toFixed(Number(user.availableFunds?.[productID]?.base_increment.split('1')[0].length - 1)))} ${user.availableFunds?.[productID]?.base_currency}`
            :
            `${user.availableFunds?.[productID]?.quote_currency === 'USD' && "$"}${numberWithCommas(Number(user.availableFunds?.[productID]?.quote_available)
              .toFixed(Number(user.availableFunds?.[productID]?.quote_increment.split('1')[0].length - 1)))} 
              ${user.availableFunds?.[productID]?.quote_currency !== 'USD' ? user.availableFunds?.[productID]?.quote_currency : ''}`
          }
        </div>
      </div> */}
      {/* let's use a select dropdown instead of a strong, and get rid of the onClick behavior */}
      <div className="info status-ticker">
        <select
          value={availableFundsDisplay}
          onChange={(e) => { setAvailableFundsDisplay(e.target.value) }}
        >
          <option value={true}>Available {user.availableFunds?.[productID]?.base_currency}</option>
          <option value={false}>Available {user.availableFunds?.[productID]?.quote_currency}</option>

        </select>
        {width > 800 ? <br /> : <div className='spacer' />}

        {availableFundsDisplay === "true"
          ? `${numberWithCommas(Number(user.availableFunds?.[productID]?.base_available).toFixed(Number(user.availableFunds?.[productID]?.base_increment.split('1')[0].length - 1)))}`
          : `${user.availableFunds?.[productID]?.quote_currency === 'USD' && "$"}${numberWithCommas(Number(user.availableFunds?.[productID]?.quote_available)
            .toFixed(Number(user.availableFunds?.[productID]?.quote_increment.split('1')[0].length - 1)))}
            ${user.availableFunds?.[productID]?.quote_currency !== 'USD' ? user.availableFunds?.[productID]?.quote_currency : ''}`
        }
      </div>

      {/* <center onClick={() => { setFeeDisplay(!feeDisplay) }}>
        {feeDisplay
          ? <p className="info status-ticker">
            <strong>Maker Fee</strong>
            {width > 800 ? <br /> : <div className='spacer' />}
            {Number((user.maker_fee * 100).toFixed(2))}%
          </p>
          : <p className="info status-ticker">
            <strong>Taker Fee</strong>
            {width > 800 ? <br /> : <div className='spacer' />}
            {Number((user.taker_fee * 100).toFixed(2))}%
          </p>
        }
      </center> */}
      {/* let's use a select dropdown instead of a strong, and get rid of the onClick behavior */}
      <div className="info status-ticker">
        <select
          value={feeDisplay}
          onChange={(e) => { setFeeDisplay(e.target.value) }}
        >
          <option value={true}>Maker Fee</option>
          <option value={false}>Taker Fee</option>

        </select>
        {width > 800 ? <br /> : <div className='spacer' />}
        {feeDisplay === "true"
          ? `${Number((user.maker_fee * 100).toFixed(2))}%`
          : `${Number((user.taker_fee * 100).toFixed(2))}%`
        }
      </div>


      {/* <center> */}
      <div className="info status-ticker">
        <strong>30 Day Volume</strong>
        {width > 800 ? <br /> : <div className='spacer' />}
        ${numberWithCommas(Number(user.usd_volume).toFixed(2))}
      </div>
      {/* </center> */}


      <div>
        <div className="info status-ticker">
          <strong>Open Order Counts</strong>
          {width > 800 ? <br /> : <div className='spacer' />}
          <div>
            <strong>B:</strong>{numberWithCommas(openBuysQuantity)} <strong>S:</strong>{numberWithCommas(openSellsQuantity)} <strong>T:</strong>{numberWithCommas(openOrderQuantity)}
          </div>
        </div>
      </div>
      {width > 800 ? <br /> : ''}
      {/* <br /> */}



      <div className='controls'>

        <div className={`info status-ticker heartbeat ${theme} ${heartbeat?.count === 0 && 'blue'}`}>
          <div>
            <strong>
              <span className={`${coinbotSocket} ${theme}`}>&#x2022;</span>
              {/* <strong> */}
              {heartbeat?.heart}{heartbeat?.beat}
              {/* </strong> */}
              <span className={`${socketStatus} ${theme}`}>&#x2022;</span>
            </strong>
          </div>
          {/* {width > 800 ? <br /> : ''} */}
        </div>

        <button className={`${btnColor} ${theme}`} onClick={updateUser}>Refresh</button>

        <div className="info status-ticker auto-scroll"><strong>Scroll</strong>
          <input
            type="checkbox"
            checked={props.isAutoScroll}
            onChange={props.handleAutoScrollChange}
          />
        </div>

        {user.paused && <strong className='red'>~~~PAUSED~~~</strong>}

      </div>

    </div>
  )
}

export default Status;