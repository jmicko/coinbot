import './IncrementButtons.css';
import { FormEvent } from 'react';
// import { useSocket } from '../../contexts/SocketProvider';
import useWindowDimensions from '../../hooks/useWindowDimensions';
// import IncrementButtons from './IncrementButtons';
import { numberWithCommas, tNum, no, fixedFloor, devLog } from '../../shared';
import { EventType, OrderParams } from '../../types';
import { useUser } from '../../contexts/useUser';
import { useData } from '../../contexts/useData';

interface limitOrderProps {
  toggleCollapse: () => void;
  toggleTradeType: (e: EventType) => void;
}

function LimitOrder(props: limitOrderProps) {

  // contexts
  const { user, theme, btnColor } = useUser();
  const currentPrice = 20;
  const {
    productID,
    createMarketTrade,
    currentProduct,
    marketOrder,
    setMarketOrder,
    // setTradeType,
  } = useData();

  // hooks
  const { width } = useWindowDimensions();

  // the side is the value of the button so it should be on the event
  function handleSideChange(e: FormEvent<HTMLInputElement>) {
    no(e);
    // console.log(e.currentTarget.value, 'side');
    const side = e.currentTarget.value;
    setMarketOrder((prevMarketOrder: OrderParams) => {
      return { ...prevMarketOrder, side: side }
    })
  }

  // destructuring
  const { base_size, side } = marketOrder;
  const toggleCollapse = props.toggleCollapse;
  // const toggleTradeType = props.toggleTradeType;

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

  return (
    <div className={`Trade scrollable boxed ${side}-color`} >

      <h3 className={`title market-order ${theme}`}>
        {width > 800 &&
          <button
            className={`${btnColor} ${theme}`}
            onClick={toggleCollapse}
          >
            &#9664;
          </button>} Market Order <button
            className={`${btnColor} ${theme}`}
            value={'limit'}
            onClick={props.toggleTradeType}
          >Switch</button>
      </h3>
      {/* form with a single input. Input takes a price point at which to make a trade */}
      <div className={`Trade`}>
        <form
          className={`basic-trade-form`}
          onSubmit={submitTransaction}
        >
          {/* SIDE BUTTONS */}
          <div className={`basic-trade-buttons`}>
            <input
              className={`btn-green btn-side ${theme}`}
              onClick={handleSideChange}
              type="button"
              name="buy"
              value="BUY" />
            <input
              className={`btn-red btn-side ${theme}`}
              onClick={handleSideChange}
              type="button"
              name="sell"
              value="SELL" />
          </div>

          <h4>
            <strong>
              {
                side === 'BUY'
                  ? 'Buying'
                  : 'Selling'
              }
            </strong>
          </h4>

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
              setMarketOrder((prevMarketOrder: OrderParams) => { return { ...prevMarketOrder, base_size: tNum(e) } })
            }
            }
          />

          {(side === 'SELL') && <input
            className={`${btnColor} ${theme}`}
            // onClick={() => setBasicAmount(Number(user.availableFunds?.[productID].base_available))}
            onClick={() => setMarketOrder((prevMarketOrder: OrderParams) => { return { ...prevMarketOrder, base_size: Number(fixedFloor(user?.availableFunds?.[productID].base_available || 1, currentProduct?.base_increment_decimals || 1)) } })}
            type="button"
            name="submit"
            value="Max" />}
          <br />

          {/* SUBMIT ORDER BUTTON */}
          <input className={`btn-send-trade market ${btnColor} ${theme}`} type="submit" name="submit" value={`${side === 'BUY' ? 'Buy' : 'Sell'} ${base_size} ${currentProduct?.base_currency_id}`} />
          <p>
            This equates to about
            <br />${numberWithCommas(((base_size || 1) * currentPrice).toFixed(2))}
            <br />before fees
          </p>

        </form>
      </div>
    </div>
  )
}

export default LimitOrder;
