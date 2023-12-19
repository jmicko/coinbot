import './Trade.css';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import LimitOrder from './LimitOrder';
import MarketOrder from './MarketOrder';
import useLocalStorage from '../../hooks/useLocalStorage';
import { no } from '../../shared';
import { EventType } from '../../types';
import { useUser } from '../../contexts/useUser';
import { useData } from '../../contexts/useData';


function Trade() {
  // contexts
  const { user } = useUser();

  // state
  // const [tradeType, setTradeType] = useLocalStorage<boolean>('tradeType', true);
  const [collapse, setCollapse] = useLocalStorage<boolean>('collapse', true);
  const { tradeType, setTradeType } = useData();

  // hooks
  const { width } = useWindowDimensions();

  // functions
  function toggleTradeType(e: EventType) {
    no(e);
    if (e.currentTarget) {
      const newTradeType = (e.currentTarget as HTMLInputElement).value || 'limit'
      setTradeType(newTradeType);
    }
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
      ? tradeType === 'limit'
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
        <button
          className={`btn-black btn-collapse ${user.theme}`}
          onClick={toggleCollapse}
        >
          &#9654;<br />&#9654;<br />&#9654;
        </button>
        {/* <button
          className={`btn-black btn-collapse ${user.theme}`}
          onClick={toggleCollapse}
        >
          &#9654;<br /><br />&#9654;<br /><br />&#9654;
        </button> */}
      </div>
  );
}

export default Trade;
