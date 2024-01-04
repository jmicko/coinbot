import './Trade.css';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import LimitOrder from './LimitOrder';
import MarketOrder from './MarketOrder';
// import useLocalStorage from '../../hooks/useLocalStorage';
import { no } from '../../shared';
import { EventType } from '../../types';
import { useUser } from '../../hooks/useUser';
import { useData } from '../../hooks/useData';
import { useMemo } from 'react';


function Trade() {
  // contexts
  const { user } = useUser();

  // state
  const { tradeType, setTradeType, collapseTradePanel, setCollapseTradePanel } = useData();

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
    console.log('toggle collapse');

    setCollapseTradePanel((prevCollapse) => {
      console.log('prevCollapse', prevCollapse);

      if (prevCollapse) {
        console.log('setting collapse to false', collapseTradePanel);

        return false
      } else {
        console.log('setting collapse to true', collapseTradePanel);
        return true
      }
    });
  }

  interface TradePages {
    [key: string]: JSX.Element;
  }

  const tradePages: TradePages = useMemo(() => ({
    "Trade Pair": <LimitOrder />,
    "Market Order": <MarketOrder />,
  }), []);

  return (
    <div className={`Trade boxed`} >

      {width > 800 &&
        <button
          className={`btn-black trade-collapse ${user.theme}`}
          onClick={toggleCollapse}
        >
          {collapseTradePanel
            ? <>&#9654;<br />&#9654;<br />&#9654;</>
            : <>&#9664;<br />&#9664;<br />&#9664;</>
          }
        </button>}

      {/* <div className="trade-panel"> */}

      <div className="trade-nav">
        {(!collapseTradePanel || width < 800) &&
          Object.keys(tradePages).map((page, i) => {
            return (
              <button
                key={i}
                className={`btn-nav ${user.theme} ${tradeType === page && "selected"}`}
                value={page}
                onClick={() => { setTradeType(page) }}
              >{page}</button>
            )
          })
        }
      </div>

      <div className="trade-pages scrollable">
        {(!collapseTradePanel || width < 800) &&
          tradePages[tradeType]
        }
      </div>
      {/* </div> */}
    </div>
  );
}

export default Trade;
