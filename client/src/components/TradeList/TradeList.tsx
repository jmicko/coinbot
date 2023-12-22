import { useEffect, useRef, } from 'react';
import SingleTrade from '../SingleTrade/SingleTrade'
import coinbotFilled from "../../../src/coinbotFilled.png";
// import coinbotFilledGif from "../../../src/coinbotFilled.gif";
import './TradeList.css'
import Meter from '../Meter/Meter';
import { useUser } from '../../contexts/useUser.js';
import { Order } from '../../types/index';
import { useWebSocket } from '../../contexts/useWebsocket';
import { useData } from '../../contexts/useData.js';

// props: { isAutoScroll: boolean }
function TradeList() {
  const robotRef = useRef<HTMLDivElement | null>(null)
  const { tickers } = useWebSocket();
  const { user, theme, } = useUser();
  const { orders, canScroll, productID, pqd } = useData();

  const highestBuy = Number(orders.buys[0]?.limit_price || 0);
  const lowestSell = Number(orders.sells[0]?.limit_price || 0);
  const currentPrice = tickers[productID]?.price;

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
      {/* map the sell array on top and buy array on bottom */}
      {orders.sells.slice(0).reverse().map((sell: Order) => (
        <SingleTrade key={sell.order_id} order={sell} preview={false} />
      ))}

      {/* ROBOT */}
      <div className='robot' ref={robotRef}>
        <div className='live-price'>
          <Meter
            // product={props.product}
            max={lowestSell}
            min={highestBuy}
          />
          <div>
            {lowestSell !== 0 && highestBuy >= 0
              ? <p className='price'>
                &#9650; ${(lowestSell - currentPrice).toFixed(pqd || 2)}
                <br />
                <span className={`green ${theme}`} >
                  {`> $${Number(currentPrice).toFixed(pqd || 2)} <`}
                </span>
                <br />
                &#9660; ${
                  (currentPrice - highestBuy).toFixed(pqd || 2)
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