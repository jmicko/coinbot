import { useEffect, useState, useRef, } from 'react';
import SingleTrade from '../SingleTrade/SingleTrade'
import coinbotFilled from "../../../src/coinbotFilled.png";
// import coinbotFilledGif from "../../../src/coinbotFilled.gif";
import './TradeList.css'
// import Meter from '../Meter/Meter';
import { useUser } from '../../contexts/UserContext.js';
import { useData } from '../../contexts/DataContext.js';
import { Order } from '../../types/index.js';
// import { useWebSocket } from '../../contexts/WebSocketContext.js';

// props: { isAutoScroll: boolean }
function TradeList() {
  const robotRef = useRef<HTMLDivElement | null>(null)
  // const { currentPrice } = useWebSocket();
  const { user, theme, } = useUser();
  const { orders, isAutoScroll, canScroll } = useData();
  // these will store mapped arrays as html so they can be used after page loads
  const [buys, setBuys] = useState(<></>);
  const [sells, setSells] = useState(<></>);

  const [highestBuy, setHighestBuy] = useState(0);
  const [lowestSell, setLowestSell] = useState(0);


  // this watches the store and maps arrays to html when it changes because can't map nothing
  useEffect(() => {
    if (orders.sells !== undefined) {
      setLowestSell(Number(orders.sells[0]?.limit_price || 0))
      setSells(orders.sells.slice(0).reverse().map((sell: Order) => {
        return <SingleTrade key={sell.order_id} order={sell} preview={false} />
      }))
    }
    if (orders.buys !== undefined) {
      setHighestBuy(Number(orders.buys[0]?.limit_price || 0))
      setBuys(orders.buys.map((buy: Order) => {
        return <SingleTrade key={buy.order_id} order={buy} preview={false} />
      }))
    }
  }, [orders, orders.sells, orders.buys]);

  // set the canScroll to the value of isAutoScroll
  useEffect(() => {
    canScroll.current = isAutoScroll;
  }, [isAutoScroll]);

  // scroll to the robot when the canScroll is true
  useEffect(() => {
    if (canScroll.current) {
      robotRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [buys]);


  return (
    <div className="TradeList scrollable boxed">
      {/* map the sell array on top and buy array on bottom */}
      {sells}
      <div className='robot' ref={robotRef}>

        <div className='live-price'>
          {/* <Meter
            // product={props.product}
            max={lowestSell}
            min={highestBuy}
          // current={socket.tickers[props.product].price}
          /> */}
          <div>

            {lowestSell !== 0 && highestBuy >= 0
              ? <p className='price'>&#9650; ${
                // (lowestSell - currentPrice).toFixed(2)
              }
                <br />
                <span className={`green ${theme}`} >
                  {`>`} ${
                    // Number(currentPrice).toFixed(2)
                  } {`<`}
                </span>
                <br />
                &#9660; ${
                  // (currentPrice - highestBuy).toFixed(2)
                }
              </p>
              : <p>No Sells!</p>
            }
          </div>
        </div>

        {user.botMaintenance
          ? <strong className='red'>~~~UNDER MAINTENANCE~~~</strong>
          : <img className="coinbot-image" src={coinbotFilled} alt="coinbot" />
        }

        {lowestSell !== 0 && highestBuy >= 0
          ? <center><p><strong>Margin</strong><br />${(lowestSell - highestBuy).toFixed(2)}</p></center>
          : <p>No Sells!</p>
        }
      </div>
      {/* {JSON.stringify(orders)} */}
      {buys}
    </div>
  )
}

export default TradeList;