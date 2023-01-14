import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketProvider.js';
import useWindowDimensions from '../../hooks/useWindowDimensions.js';
import './Trade.css';
import IncrementButtons from './IncrementButtons.js';
import { devLog, numberWithCommas } from '../../shared.js';
import { useUser } from '../../contexts/UserContext.js';
import { useData } from '../../contexts/DataContext.js';
import LimitOrder from './LimitOrder.js';
import MarketOrder from './MarketOrder.js';


function Trade() {
  // contexts
  const { user } = useUser();

  // state
  const [tradeType, setTradeType] = useState(true);
  const [collapse, setCollapse] = useState(false);
  const [basicAmount, setBasicAmount] = useState(0);
  const [side, setSide] = useState('BUY');

  // hooks
  const { width } = useWindowDimensions();


  function toggleTradeType() {
    setTradeType(!tradeType);
  }

  function toggleCollapse() {
    setCollapse((prevCollapse) => {
      if (prevCollapse) {
        return false
      } else {
        return true
      }
    });
  }


  return (
    !collapse || width < 800
      ? tradeType
        ? <div className="Trade scrollable boxed" >
          <h3 className={`title ${user.theme}`}>
            {width > 800
              && <button
                className={`btn-blue ${user.theme}`}
                onClick={toggleCollapse} >&#9664;</button>
            } New Trade-Pair <button
              className={`btn-blue ${user.theme}`}
              onClick={toggleTradeType}
            >Switch</button>
          </h3>
          <LimitOrder />
        </div>

        : <div className={`Trade scrollable boxed`} >

          <h3 className={`title market-order ${user.theme}`}>{width > 800 && <button className={`btn-blue ${user.theme}`} onClick={toggleCollapse} >&#9664;</button>} Market Order <button className={`btn-blue ${user.theme}`} onClick={toggleTradeType} >Switch</button></h3>
          {/* form with a single input. Input takes a price point at which to make a trade */}
          <MarketOrder />


        </div>
      : <div className={`Trade scrollable boxed collapsed`} >
        <button className={`btn-black btn-collapse ${user.theme}`} onClick={toggleCollapse} >&#9654;<br />&#9654;<br />&#9654;</button>
        {/* <button className={`btn-blue btn-collapse ${user.theme}`} onClick={toggleCollapse} >&#9654;<br/><br/>&#9654;<br/><br/>&#9654;</button> */}
      </div>
  );
}

export default Trade;
