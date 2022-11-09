import React, { useEffect, useState, useCallback, useRef } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import SingleTrade from '../SingleTrade/SingleTrade'
import coinbotFilled from "../../../src/coinbotFilled.png";
// import coinbotFilledGif from "../../../src/coinbotFilled.gif";
import './TradeList.css'
import Meter from '../Meter/Meter';


function TradeList(props) {
  const dispatch = useDispatch();

  // these will store mapped arrays as html so they can be used after page loads
  const [buys, setBuys] = useState(<></>);
  const [sells, setSells] = useState(<></>);

  const [highestBuy, setHighestBuy] = useState(0);
  const [lowestSell, setLowestSell] = useState(0);
  const [alreadyScrolled, setAlreadyScrolled] = useState(false);


  // this watches the store and maps arrays to html when it changes because can't map nothing
  useEffect(() => {
    if (props.store.ordersReducer.openOrdersInOrder.sells !== undefined) {
      setLowestSell(Number(props.store.ordersReducer.openOrdersInOrder.sells[0]?.price || 0))
      setSells(props.store.ordersReducer.openOrdersInOrder.sells.slice(0).reverse().map((sell) => {
        return <SingleTrade key={sell.id} order={sell} theme={props.theme} />
      }))
    }
    if (props.store.ordersReducer.openOrdersInOrder.buys !== undefined) {
      setHighestBuy(Number(props.store.ordersReducer.openOrdersInOrder.buys[0]?.price || 0))
      setBuys(props.store.ordersReducer.openOrdersInOrder.buys.map((sell) => {
        return <SingleTrade key={sell.id} order={sell} theme={props.theme} />
      }))
      dispatch({
        type: 'SET_SCROLL',
        payload: {
          canScroll: true
        }
      });
    }

  }, [props.store.ordersReducer.openOrdersInOrder.sells, props.store.ordersReducer.openOrdersInOrder.buys]);

  const robotRef = useRef()

  const scrollToRobot = () => {
    robotRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  // let alreadyScrolled = false

  useEffect(() => {
    // setAlreadyScrolled(true);

    if (!props.store.settingsReducer.scrollingReducer.canScroll || props.isAutoScroll) {

      // alreadyScrolled = true;
      scrollToRobot();
    }

    // triggered on buys because they will load last
  }, [buys])


  return (
    <div className="TradeList scrollable boxed">
      {/* map the sell array on top and buy array on bottom */}
      {sells}
      {/* {JSON.stringify(props.store.settingsReducer.scrollingReducer.canScroll)} */}
      <div className='robot' ref={robotRef}>

        <div className='live-price'>
          <Meter
            max={lowestSell}
            min={highestBuy}
            current={props.priceTicker}
          />

          {/* <meter className="price-meter"
            min={highestBuy} max={lowestSell}
            // low="33" high="66" optimum="80"
            value={Number(props.priceTicker).toFixed(0) || 0}>
            at 50/100
          </meter> */}
          <div>

            {lowestSell !== 0 && highestBuy !== 0 && <p className='price'>&#9650; ${(lowestSell - props.priceTicker).toFixed(2)}<br />
              &#9660; ${(props.priceTicker - highestBuy).toFixed(2)}</p>}
          </div>
        </div>


        {props.store.accountReducer.userReducer.botMaintenance
          ? <strong className='red'>~~~UNDER MAINTENANCE~~~</strong>
          : <img className="coinbot-image" src={coinbotFilled} alt="coinbot" />
        }


        {lowestSell !== 0 && highestBuy !== 0 && <center><p><strong>Margin</strong><br />${(lowestSell - highestBuy).toFixed(2)}</p></center>}
      </div>
      {buys}
    </div>
  )
}

export default connect(mapStoreToProps)(TradeList);