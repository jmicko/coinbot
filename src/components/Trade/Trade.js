import React, { useState } from 'react';
import './Trade.css';
import useWindowDimensions from '../../hooks/useWindowDimensions.js';
import { useUser } from '../../contexts/UserContext.js';
import LimitOrder from './LimitOrder.js';
import MarketOrder from './MarketOrder.js';


function Trade() {
  // contexts
  const { user } = useUser();

  // state
  const [tradeType, setTradeType] = useState(true);
  const [collapse, setCollapse] = useState(true);

  // hooks
  const { width } = useWindowDimensions();

  // functions
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
    !collapse || width < 1100
      ? tradeType
        ?
        <LimitOrder
          toggleCollapse={toggleCollapse}
          toggleTradeType={toggleTradeType}
        />
        :
        <MarketOrder
          toggleCollapse={toggleCollapse}
          toggleTradeType={toggleTradeType}
        />
      : <div className={`Trade scrollable boxed collapsed`} >
        <button className={`btn-black btn-collapse ${user.theme}`} onClick={toggleCollapse} >&#9654;<br />&#9654;<br />&#9654;</button>
        {/* <button className={`btn-blue btn-collapse ${user.theme}`} onClick={toggleCollapse} >&#9654;<br/><br/>&#9654;<br/><br/>&#9654;</button> */}
      </div>
  );
}

export default Trade;
