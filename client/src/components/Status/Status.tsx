import { useEffect, useState } from 'react';
import { useUser } from '../../contexts/useUser.js';
import useLocalStorage from '../../hooks/useLocalStorage';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import { numberWithCommas } from '../../shared';
import './Status.css'
import { ProfitForDuration } from '../../types/index';
import { useWebSocket } from '../../contexts/useWebsocket';
import { useData } from '../../contexts/useData.js';
// import { useWebSocket } from '../../contexts/WebSocketContext';


function Status() {
  // devLog('rendering status');

  const { user, refreshUser, theme, btnColor } = useUser();
  const { tickers, heartbeat } = useWebSocket();
  const {
    // socketStatus, coinbotSocket,
    orders, refreshOrders,
    productID, refreshProducts,
    profit, refreshProfit,
    availableBase, availableQuote,
    isAutoScroll, setIsAutoScroll,
    pqd, pbd,
  } = useData();

  const productPrice = Number(tickers?.[productID]?.price).toFixed(pqd);

  const openOrdersInOrder = orders;
  const [openSellsQuantity, setOpenSellsQuantity] = useState(0);
  const [openBuysQuantity, setOpenBuysQuantity] = useState(0);
  const [openOrderQuantity, setOpenOrderQuantity] = useState(0);

  const [profitDisplay, setProfitDisplay] = useLocalStorage<string>('profitDisplay', '0');
  const [availableFundsDisplay, setAvailableFundsDisplay] = useLocalStorage<string>('availableFundsDisplay', 'false');
  const [feeDisplay, setFeeDisplay] = useLocalStorage<string>('feeDisplay', 'true');

  const profitAccuracy = user?.profit_accuracy;

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
      <div className="info status-ticker">
        <select
          id='profitDisplay-select'
          value={profitDisplay}
          onChange={(e) => { setProfitDisplay(e.target.value) }}
        >
          {profit.map((p: ProfitForDuration, i: number) => {
            return (
              <option key={i} value={i}>{p.duration} {p.duration !== 'Since Reset' && p.duration !== '4 Week Avg' && 'Profit'}</option>
            )
          })}
        </select>
        {width > 800 ? <br /> : <div className='spacer' />}
        ${numberWithCommas(Number(profit[Number(profitDisplay)]?.productProfit).toFixed(profitAccuracy))} /
        ${numberWithCommas(Number(profit[Number(profitDisplay)]?.allProfit).toFixed(profitAccuracy))}
      </div>

      <div className="info status-ticker">
        <strong>{productID} Price</strong>
        {width > 800 ? <br /> : <div className='spacer' />}
        {/* jesus christ why would you build something so convoluted yet functional */}
        {productPrice}
      </div>

      <div className="info status-ticker">
        <select
          id='availableFundsDisplay-select'
          value={availableFundsDisplay}
          onChange={(e) => { setAvailableFundsDisplay(e.target.value) }}
        >
          <option value={'true'}>Available {user?.availableFunds?.[productID]?.base_currency}</option>
          <option value={'false'}>Available {user?.availableFunds?.[productID]?.quote_currency}</option>

        </select>
        {width > 800 ? <br /> : <div className='spacer' />}

        {availableFundsDisplay === "true"
          ? `${numberWithCommas(Number(availableBase).toFixed(pbd))}`
          : `${user?.availableFunds?.[productID]?.quote_currency === 'USD' && "$"}${numberWithCommas(Number(availableQuote)
            .toFixed(pqd))}
            ${user?.availableFunds?.[productID]?.quote_currency !== 'USD' ? user?.availableFunds?.[productID]?.quote_currency : ''}`
        }
      </div>

      <div className="info status-ticker">
        <select
          id='feeDisplay-select'
          value={feeDisplay}
          onChange={(e) => { setFeeDisplay(e.target.value) }}
        >
          <option value={'true'}>Maker Fee</option>
          <option value={'false'}>Taker Fee</option>

        </select>
        {width > 800 ? <br /> : <div className='spacer' />}
        {feeDisplay === "true"
          ? `${Number(((user?.maker_fee || 0) * 100).toFixed(2))}%`
          : `${Number(((user?.taker_fee || 0) * 100).toFixed(2))}%`
        }
      </div>

      <div className="info status-ticker">
        <strong>30 Day Volume</strong>
        {width > 800 ? <br /> : <div className='spacer' />}
        ${numberWithCommas(Number(user?.usd_volume).toFixed(2))}
      </div>

      <div className="info status-ticker">
        <strong>Open Order Counts</strong>
        {width > 800 ? <br /> : <div className='spacer' />}
        <strong>B:</strong>{numberWithCommas(openBuysQuantity)}&nbsp;<strong>S:</strong>{numberWithCommas(openSellsQuantity)}&nbsp;<strong>T:</strong>{numberWithCommas(openOrderQuantity)}
      </div>
      {width > 800 ? <br /> : ''}

      <div className='controls'>

        <div className={`info status-ticker heartbeat ${theme} ${heartbeat?.count === 0 && 'blue'}`}>
          <div> {/* leave this div here or the heartbeat will turn gray  */}
            <strong>
              {/* <span className={`${coinbotSocket} ${theme}`}>&#x2022;</span> */}
              {heartbeat?.heart}{heartbeat?.beat}
              {/* <span className={`${socketStatus} ${theme}`}>&#x2022;</span> */}
            </strong>
          </div> {/* leave this div here or the heartbeat will turn gray  */}
        </div>

        <button className={`${btnColor} ${theme}`} onClick={updateUser}>Refresh</button>

        <div className="info status-ticker auto-scroll"><strong>Scroll</strong>
          <input
            type="checkbox"
            name="autoScroll"
            id="autoScroll"  
            checked={isAutoScroll}
            onChange={() => { setIsAutoScroll(!isAutoScroll); }}
          />
        </div>

        {user?.paused && <strong className='red'>~~~PAUSED~~~</strong>}

      </div>
      {/* {JSON.stringify(profit)} */}
    </div>
  )
}

export default Status;