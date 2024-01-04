import './IncrementButtons.css';
import { FormEvent } from 'react';
// import useWindowDimensions from '../../hooks/useWindowDimensions';
// import IncrementButtons from './IncrementButtons';
import { numberWithCommas, no, devLog } from '../../shared';
import { EventType, OrderParams } from '../../types';
import { useData } from '../../hooks/useData';
import { useWebSocket } from '../../hooks/useWebsocket';
import { useUser } from '../../hooks/useUser';


function LimitOrder() {

  // contexts
  const { theme, btnColor } = useUser();
  // const currentPrice = 20;
  const {
    productID,
    createMarketTrade,
    currentProduct,
    marketOrder,
    setMarketOrder,
    baseID,
    quoteID,
    pqd,
    pbd,
    availableBase,

    // setTradeType,
  } = useData();
  const { currentPrice: currentPriceString, } = useWebSocket();
  const currentPrice = Number(currentPriceString);

  // hooks
  // const { width } = useWindowDimensions();

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
  // const toggleCollapse = props.toggleCollapse;
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

  if (!currentProduct.base_increment) {
    return (
      <div className={`${side}-color`} >
        <div className={`Trade`}>
          <p>loading...</p>
        </div>
      </div>
    )
  }

  return (
    // <div className={``} >

    // {/* form with a single input. Input takes a price point at which to make a trade */}
    // {/* <div className={``}> */}
    <form
      className={`basic-trade-form ${side}-color`}
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
              ? `Buying ${baseID} with ${quoteID}`
              : `Selling ${baseID} for ${quoteID}`
          }
        </strong>
      </h4>
      <p>
        {Number(currentProduct.base_increment)} {baseID} increments <br />
        {Number(currentProduct.base_min_size).toFixed(pbd)} {baseID} minimum
        <br />
        <br />
      </p>

      {/* SIZE INPUT */}
      <label htmlFor="trade-amount">
        Trade size in {currentProduct?.base_currency_id}:
        <br />
        <input
          className={theme}
          type="number"
          name="trade-amount"
          id="trade-amount"
          value={base_size}
          step={Number(currentProduct.base_increment)}
          min={Number(currentProduct.base_min_size)}
          max={Number(currentProduct.base_max_size)}
          required
          onChange={(e) => {
            // no(e);
            setMarketOrder((prevMarketOrder: OrderParams) => {
              return {
                ...prevMarketOrder,
                base_size: e.target.value
                  ? Number(e.target.value)
                  : undefined
              }
            })
          }
          }
        />
      </label>

      {(side === 'SELL') && <input
        className={`${btnColor} ${theme}`}
        // onClick={() => setBasicAmount(Number(user.availableFunds?.[productID].base_available))}
        onClick={() => setMarketOrder((prevMarketOrder: OrderParams) => {
          console.log(pbd, 'pbd');
          console.log(currentProduct?.base_increment_decimals, 'currentProduct?.base_increment_decimals');


          return {
            ...prevMarketOrder,
            base_size: Number(Number(availableBase).toFixed(pbd))
          }
        })}
        type="button"
        name="submit"
        value="Max" />}
      <br />

      {/* SUBMIT ORDER BUTTON */}
      {(base_size !== undefined) && (base_size > 0) ? <input
        className={`btn-send-trade market ${btnColor} ${theme}`}
        type="submit"
        name="submit"
        value={`${side === 'BUY' ? 'Buy' : 'Sell'} ${base_size} ${currentProduct?.base_currency_id}`}
      />
        : <input
          className={`btn-send-trade market ${btnColor} ${theme}`}
          type="submit"
          name="submit"
          value={'Enter a Valid Amount'}
          disabled
        />
      }
      {(base_size !== undefined) && (base_size > 0) && <p>
        {/* && (base_size > 0)) && <p> */}
        This equates to about
        <br />${numberWithCommas(((base_size) * currentPrice).toFixed(pqd))}
        <br />before fees
      </p>}

    </form>
    // {/* end form */}
    // {/* </div> */}
    // </div>
  )
}

export default LimitOrder;
