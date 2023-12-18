import { useEffect, useState } from 'react';
import { useData } from '../../contexts/DataContext.js';
// import { useSocket } from '../../contexts/SocketProvider.js';
import { useUser } from '../../contexts/UserContext.js';
import useLocalStorage from '../../hooks/useLocalStorage.js';
import useWindowDimensions from '../../hooks/useWindowDimensions.js';
import { numberWithCommas } from '../../shared.js';
import './Status.css'
// import { useWebSocket } from '../../contexts/WebSocketContext.js';
import { ProfitForDuration } from '../../types/index.js';


function Status() {
  // devLog('rendering status');

  const { user, refreshUser, theme, btnColor } = useUser();
  // const { tickers, heartbeat } = useWebSocket();
  const {
    // socketStatus, coinbotSocket,
    orders, refreshOrders,
    productID, refreshProducts,
    profit, refreshProfit,
    availableBase, availableQuote,
    isAutoScroll, setIsAutoScroll,
  } = useData();

  // const productPrice = Number(tickers?.[productID]?.price).toFixed(Number(user.availableFunds?.[productID]?.quote_increment.split('1')[0].length - 1));

  const openOrdersInOrder = orders;
  const [openSellsQuantity, setOpenSellsQuantity] = useState(0);
  const [openBuysQuantity, setOpenBuysQuantity] = useState(0);
  const [openOrderQuantity, setOpenOrderQuantity] = useState(0);

  const [profitDisplay, setProfitDisplay] = useLocalStorage<string>('profitDisplay', '0');
  const [availableFundsDisplay, setAvailableFundsDisplay] = useLocalStorage<string>('availableFundsDisplay', 'false');
  const [feeDisplay, setFeeDisplay] = useLocalStorage<string>('feeDisplay', 'true');

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
      <div className="info status-ticker">
        <select
          value={profitDisplay}
          onChange={(e) => { setProfitDisplay(e.target.value) }}
        >
          {profit.map((p:ProfitForDuration, i:number) => {
            return (
              <option key={i} value={i}>{p.duration} {p.duration !== 'Since Reset' && p.duration !== '4 Week Avg' && 'Profit'}</option>
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
        {/* jesus christ why would you build something so convoluted yet functional */}
        {/* {productPrice} */}
      </div>

      <div className="info status-ticker">
        <select
          value={availableFundsDisplay}
          onChange={(e) => { setAvailableFundsDisplay(e.target.value) }}
        >
          <option value={'true'}>Available {user.availableFunds?.[productID]?.base_currency}</option>
          <option value={'false'}>Available {user.availableFunds?.[productID]?.quote_currency}</option>

        </select>
        {width > 800 ? <br /> : <div className='spacer' />}

        {availableFundsDisplay === "true"
          ? `${numberWithCommas(Number(availableBase).toFixed(Number(user.availableFunds?.[productID]?.base_increment.split('1')[0].length - 1)))}`
          : `${user.availableFunds?.[productID]?.quote_currency === 'USD' && "$"}${numberWithCommas(Number(availableQuote)
            .toFixed(Number(user.availableFunds?.[productID]?.quote_increment.split('1')[0].length - 1)))}
            ${user.availableFunds?.[productID]?.quote_currency !== 'USD' ? user.availableFunds?.[productID]?.quote_currency : ''}`
        }
      </div>

      <div className="info status-ticker">
        <select
          value={feeDisplay}
          onChange={(e) => { setFeeDisplay(e.target.value) }}
        >
          <option value={'true'}>Maker Fee</option>
          <option value={'false'}>Taker Fee</option>

        </select>
        {width > 800 ? <br /> : <div className='spacer' />}
        {feeDisplay === "true"
          ? `${Number((user.maker_fee * 100).toFixed(2))}%`
          : `${Number((user.taker_fee * 100).toFixed(2))}%`
        }
      </div>

      <div className="info status-ticker">
        <strong>30 Day Volume</strong>
        {width > 800 ? <br /> : <div className='spacer' />}
        ${numberWithCommas(Number(user.usd_volume).toFixed(2))}
      </div>

      <div className="info status-ticker">
        <strong>Open Order Counts</strong>
        {width > 800 ? <br /> : <div className='spacer' />}
        <strong>B:</strong>{numberWithCommas(openBuysQuantity)}&nbsp;<strong>S:</strong>{numberWithCommas(openSellsQuantity)}&nbsp;<strong>T:</strong>{numberWithCommas(openOrderQuantity)}
      </div>
      {width > 800 ? <br /> : ''}

      <div className='controls'>

        {/* <div className={`info status-ticker heartbeat ${theme} ${heartbeat?.count === 0 && 'blue'}`}>
          <div>  leave this div here or the heartbeat will turn gray 
            <strong>
              <span className={`${coinbotSocket} ${theme}`}>&#x2022;</span>
              {heartbeat?.heart}{heartbeat?.beat}
              <span className={`${socketStatus} ${theme}`}>&#x2022;</span>
            </strong>
          </div>  leave this div here or the heartbeat will turn gray 
        </div> */}

        <button className={`${btnColor} ${theme}`} onClick={updateUser}>Refresh</button>

        <div className="info status-ticker auto-scroll"><strong>Scroll</strong>
          <input
            type="checkbox"
            checked={isAutoScroll}
            onChange={() => { setIsAutoScroll(!isAutoScroll); }}
          />
        </div>

        {user.paused && <strong className='red'>~~~PAUSED~~~</strong>}

      </div>
        {/* {JSON.stringify(profit)} */}
    </div>
  )
}

export default Status;