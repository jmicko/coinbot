import React, { useEffect, useState, useRef, } from 'react';
import { useSelector } from 'react-redux';
import { useSocket } from '../../contexts/SocketProvider';
import SingleTrade from '../SingleTrade/SingleTrade'
import coinbotFilled from "../../../src/coinbotFilled.png";
// import coinbotFilledGif from "../../../src/coinbotFilled.gif";
import './TradeList.css'
import Meter from '../Meter/Meter';
import { useData } from '../../contexts/DataContext';


function TradeList(props) {
  const socket = useSocket();
  const { user } = useData();
  const openOrdersInOrder = useSelector((store) => store.ordersReducer.openOrdersInOrder);

  // these will store mapped arrays as html so they can be used after page loads
  const [buys, setBuys] = useState(<></>);
  const [sells, setSells] = useState(<></>);

  const [highestBuy, setHighestBuy] = useState(0);
  const [lowestSell, setLowestSell] = useState(0);


  // this watches the store and maps arrays to html when it changes because can't map nothing
  useEffect(() => {
    if (openOrdersInOrder.sells !== undefined) {
      setLowestSell(Number(openOrdersInOrder.sells[0]?.limit_price || 0))
      setSells(openOrdersInOrder.sells.slice(0).reverse().map((sell) => {
        return <SingleTrade key={sell.order_id} order={sell} product={props.product} />
      }))
    }
    if (openOrdersInOrder.buys !== undefined) {
      setHighestBuy(Number(openOrdersInOrder.buys[0]?.limit_price || 0))
      setBuys(openOrdersInOrder.buys.map((buy) => {
        return <SingleTrade key={buy.order_id} order={buy} product={props.product} />
      }))
    }
  }, [openOrdersInOrder.sells, openOrdersInOrder.buys, props.product]);

  const robotRef = useRef()
  const canScrollRef = useRef(true);

  // set the canScrollRef to the value of props.isAutoScroll
  useEffect(() => {
    canScrollRef.current = props.isAutoScroll;
  }, [props.isAutoScroll]);

  // scroll to the robot when the canScrollRef is true
  useEffect(() => {
    if (canScrollRef.current) {
      robotRef.current.scrollIntoView({
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
          <Meter
            product={props.product}
            max={lowestSell}
            min={highestBuy}
          // current={socket.tickers[props.product].price}
          />
          <div>

            {lowestSell !== 0 && highestBuy >= 0
              ? <p className='price'>&#9650; ${(lowestSell - socket.tickers?.[props.product]?.price).toFixed(2)}
                <br />
                &#9660; ${(socket.tickers?.[props.product]?.price - highestBuy).toFixed(2)}
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
      {buys}
    </div>
  )
}

export default TradeList;