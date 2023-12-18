import './IncrementButtons.css';
import { FormEvent, useState } from 'react';
// import { useSocket } from '../../contexts/SocketProvider';
import useWindowDimensions from '../../hooks/useWindowDimensions';
// import IncrementButtons from './IncrementButtons';
import { numberWithCommas, tNum, no, fixedFloor, devLog } from '../../shared';
import { useUser } from '../../contexts/UserContext';
import { useData } from '../../contexts/DataContext';

interface limitOrderProps {
  toggleCollapse: () => void;
  toggleTradeType: () => void;
}

function LimitOrder(props: limitOrderProps) {

  // contexts
  const { user, theme, btnColor } = useUser();
  // const { currentPrice } = useSocket();
  const currentPrice = 20;
  const { productID, createMarketTrade, currentProduct } = useData();

  // hooks
  const { width } = useWindowDimensions();

  // state
  const [marketOrder, setMarketOrder] = useState({
    base_size: 0,
    quote_size: 0,
    side: 'BUY',
  });

  // destructuring
  const { base_size, side } = marketOrder;
  const toggleCollapse = props.toggleCollapse;
  const toggleTradeType = props.toggleTradeType;

  // functions
  function submitTransaction(e: FormEvent<HTMLFormElement>) {
    no(e);
    devLog('BASIC TRADE STARTED');
    createMarketTrade({
      base_size: base_size,
      side: side,
      product_id: productID,
      tradingPrice: currentPrice
    })
  }

  // change market order function that takes in a key and value and sets the limitOrder state
  // function changeMarketOrder(key, value) {
  //   setMarketOrder(prevState => ({
  //     ...prevState,
  //     [key]: value
  //   }))
  // }



  return (
    <div className={`Trade scrollable boxed`} >

      <h3 className={`title market-order ${theme}`}>{width > 800
        && <button
          className={`${btnColor} ${theme}`}
          onClick={toggleCollapse}
        >&#9664;</button>
      } Market Order <button
        className={`${btnColor} ${theme}`}
        onClick={toggleTradeType} >Switch</button></h3>
      {/* form with a single input. Input takes a price point at which to make a trade */}
      <div className={`Trade ${side}-color`}>
        <form className={`basic-trade-form`} onSubmit={submitTransaction} >

          {/* SIDE BUTTONS */}
          <div className={`basic-trade-buttons`}>
            <input className={`btn-green btn-side ${theme}`} onClick={(e) => {
              no(e);
              setMarketOrder((prevMarketOrder) => { return { ...prevMarketOrder, side: 'BUY' } })
            }
            } type="button" name="submit" value="BUY" />
            <input className={`btn-red btn-side ${theme}`} onClick={(e) => {
              no(e);
              setMarketOrder((prevMarketOrder) => { return { ...prevMarketOrder, side: 'SELL' } })
            }
            } type="button" name="submit" value="SELL" />
          </div>

          <p>
            <strong>
              {
                side === 'BUY'
                  ? 'Buying'
                  : 'Selling'
              }
            </strong>
          </p>

          {/* SIZE INPUT */}
          <label htmlFor="trade-amount">
            Trade size in {currentProduct?.base_currency_id}:
          </label>
          <br />
          <input
            className={theme}
            type="number"
            name="trade-amount"
            value={Number(base_size)}
            required
            onChange={(e) => {
              // no(e);
              setMarketOrder((prevMarketOrder) => { return { ...prevMarketOrder, base_size: tNum(e) } })
            }
            }
          />

          {(side === 'SELL') && <input
            className={`${btnColor} ${theme}`}
            // onClick={() => setBasicAmount(Number(user.availableFunds?.[productID].base_available))}
            onClick={() => setMarketOrder((prevMarketOrder) => { return { ...prevMarketOrder, base_size: Number(fixedFloor(user.availableFunds?.[productID].base_available, currentProduct.base_increment_decimals)) } })}
            type="button"
            name="submit"
            value="Max" />}
          <br />

          {/* SUBMIT ORDER BUTTON */}
          <input className={`btn-send-trade market ${btnColor} ${theme}`} type="submit" name="submit" value={`${side === 'BUY' ? 'Buy' : 'Sell'} ${base_size} ${currentProduct?.base_currency_id}`} />
          <p>
            This equates to about
            <br />${numberWithCommas((base_size * currentPrice).toFixed(2))}
            <br />before fees
          </p>

        </form>
      </div>
    </div>
  )
}

export default LimitOrder;
