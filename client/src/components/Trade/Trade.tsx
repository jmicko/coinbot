import { useState } from 'react';
import './Trade.css';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import { useUser } from '../../contexts/UserContext';
import LimitOrder from './LimitOrder';
// import MarketOrder from './MarketOrder';


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
    !collapse || width < 800
      ? tradeType
        ?
        // <></>
        <LimitOrder
          toggleCollapse={toggleCollapse}
          toggleTradeType={toggleTradeType}
        />
        : <></>
        // <MarketOrder
        //   toggleCollapse={toggleCollapse}
        //   toggleTradeType={toggleTradeType}
        // />
      : <div className={`Trade scrollable boxed collapsed`} >
        <button className={`btn-black btn-collapse ${user.theme}`} onClick={toggleCollapse} >&#9654;<br />&#9654;<br />&#9654;</button>
        {/* <button className={`btn-blue btn-collapse ${user.theme}`} onClick={toggleCollapse} >&#9654;<br/><br/>&#9654;<br/><br/>&#9654;</button> */}
      </div>
  );
}

export default Trade;
