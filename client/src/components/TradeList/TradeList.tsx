import { useEffect, useRef, } from 'react';
import SingleTrade from '../SingleTrade/SingleTrade'
import coinbotFilled from "../../../src/coinbotFilled.png";
// import coinbotFilledGif from "../../../src/coinbotFilled.gif";
import './TradeList.css'
import Meter from '../Meter/Meter';
import { useUser } from '../../hooks/useUser.js';
import { Order } from '../../types/index';
import { useData } from '../../hooks/useData.js';
import { useWebSocket } from '../../hooks/useWebsocket.js';

// props: { isAutoScroll: boolean }
function TradeList() {
  const robotRef = useRef<HTMLDivElement | null>(null)
  const { user, theme, } = useUser();
  const { orders, canScroll, pqd, } = useData();
  const { currentPrice } = useWebSocket();

  const highestBuy = Number(orders.buys[0]?.limit_price || 0);
  const lowestSell = Number(orders.sells[0]?.limit_price || 0);
  // const currentPrice = tickers[productID]?.price;

  // scroll to the robot when fresh trades are loaded and the canScroll is true
  useEffect(() => {
    if (canScroll.current) {
      robotRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [orders, canScroll]);

  return (
    <div className="TradeList scrollable boxed">
      {/* {JSON.stringify(orders.sells[0]?.limit_price)} <br />
      {JSON.stringify(orders.buys[0]?.limit_price)} <br />
      $$$ {JSON.stringify(currentPrice)} $$$ <br />
      {JSON.stringify(tickers)} <br /> */}
      {/* map the sell array on top and buy array on bottom */}
      {orders.sells.slice(0).reverse().map((sell: Order) => (
        <SingleTrade key={sell.order_id} order={sell} preview={false} />
      ))}

      {/* ROBOT */}
      <div className='robot' ref={robotRef}>
        <div className='live-price'>
          <Meter
            max={lowestSell}
            min={highestBuy}
          />
          <div>
            {lowestSell !== 0 && highestBuy >= 0
              ? <p className='price'>
                &#9650; ${(lowestSell - Number(currentPrice)).toFixed(pqd || 2)}
                <br />
                <span className={`green ${theme}`} >
                  {`> $${currentPrice} <`}
                </span>
                <br />
                &#9660; ${
                  (Number(currentPrice) - highestBuy).toFixed(pqd || 2)
                }
              </p>
              : <p>No Sells!</p>
            }
          </div>
        </div>
        {user?.botMaintenance
          ? <strong className='red'>~~~UNDER MAINTENANCE~~~</strong>
          : <img className="coinbot-image" src={coinbotFilled} alt="coinbot" />
        }
        {lowestSell !== 0 && highestBuy >= 0
          ? <center>
            <p>
              <strong>Margin</strong>
              <br />${(lowestSell - highestBuy).toFixed(pqd || 2)}
            </p>
          </center>
          : <p>No Sells!</p>
        }
      </div> {/* end robot */}

      {orders.buys.map((buy: Order) => (
        <SingleTrade key={buy.order_id} order={buy} preview={false} />
      ))}
    </div>
  )
}

export default TradeList;