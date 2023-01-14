import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../contexts/SocketProvider.js';
import useWindowDimensions from '../../hooks/useWindowDimensions.js';
import './IncrementButtons.css';
import IncrementButtons from './IncrementButtons.js';
import { numberWithCommas, tNum, no, fixedFloor, toFloor, fixedRound, devLog } from '../../shared.js';
import { useUser } from '../../contexts/UserContext.js';
import { useData } from '../../contexts/DataContext.js';


function LimitOrder() {

  // contexts
  const { user } = useUser();
  const { socket, currentPrice } = useSocket();
  const { productID, createMarketTrade, currentProduct } = useData();

  // state
  const [marketOrder, setMarketOrder] = useState({
    base_size: 0,
    quote_size: 0,
    side: 'BUY',
  });

  // derived state
  const { base_size, side } = marketOrder;

  // functions
  function submitTransaction(e) {
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
  function changeMarketOrder(key, value) {
    setMarketOrder(prevState => ({
      ...prevState,
      [key]: value
    }))
  }



  return (
    <div className={`Trade ${side}-color`}>
      <form className={`basic-trade-form`} onSubmit={submitTransaction} >

        {/* SIDE BUTTONS */}
        <div className={`basic-trade-buttons`}>
          <input className={`btn-green btn-side ${user.theme}`} onClick={(e) => {
            no(e);
            setMarketOrder((prevMarketOrder) => { return { ...prevMarketOrder, side: 'BUY' } })
          }
          } type="button" name="submit" value="BUY" />
          <input className={`btn-red btn-side ${user.theme}`} onClick={(e) => {
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
          className={user.theme}
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
          className={`btn-blue ${user.theme}`}
          // onClick={() => setBasicAmount(Number(user.availableFunds?.[productID].base_available))}
          onClick={() => setMarketOrder((prevMarketOrder) => { return { ...prevMarketOrder, base_size: Number(fixedFloor(user.availableFunds?.[productID].base_available, currentProduct.base_increment_decimals)) } })}
          type="button"
          name="submit"
          value="Max" />}
        <br />

        {/* SUBMIT ORDER BUTTON */}
        <input className={`btn-send-trade market btn-blue ${user.theme}`} type="submit" name="submit" value={`${side === 'BUY' ? 'Buy' : 'Sell'} ${base_size} ${currentProduct?.base_currency_id}`} />
        <p>
          This equates to about
          <br />${numberWithCommas((base_size * currentPrice).toFixed(2))}
          <br />before fees
        </p>

      </form>
    </div>
  )
}

export default LimitOrder;
