import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketProvider.js';
import useWindowDimensions from '../../hooks/useWindowDimensions.js';
import './Trade.css';
import IncrementButtons from './IncrementButtons.js';
import { numberWithCommas } from '../../shared.js';
import { useUser } from '../../contexts/UserContext.js';
import { useData } from '../../contexts/DataContext.js';


function LimitOrder() {
  const { user, makerFee } = useUser();
  const { width } = useWindowDimensions();
  const { productID, currentProduct, createOrderPair } = useData();
  const { currentPrice } = useSocket();
  const [amountType, setAmountType] = useState('quote');

  // destructure currentProduct
  const {
    base_currency_id, quote_currency_id, base_min_size, base_max_size, quote_increment, base_increment, price_rounding, quote_inverse_increment,
    base_currency, base_inverse_increment
  } = currentProduct;

  const [limitOrder, setLimitOrder] = useState({
    product_id: 'BTC-USD',
    side: 'buy',
    price: 0,
    quote_size: 0,
    base_size: 0,



    // startingValue: 1000,
    startingValue: Number(((currentPrice || 1000) / 2).toFixed(currentProduct.price_rounding - 2 > 0 ? currentProduct.price_rounding - 2 : 0)),
    skipFirst: false,
    endingValue: Number(((currentPrice || 1000) * 1.5).toFixed(currentProduct.price_rounding - 2 > 0 ? currentProduct.price_rounding - 2 : 0)),
    ignoreFunds: false,
    increment: 0.5,
    incrementType: 'percentage',
    size: 10,
    maxSize: 100,
    sizeType: 'quote',
    // trade_pair_ratio: 1.1,
    sizeCurve: 'linear',
    steepness: 10,
    trade_pair_ratio: 5
  });

  // change limitOrder function that takes in a key and value and sets the limitOrder state
  function changeLimitOrder(key, value) {
    setLimitOrder(prevState => ({
      ...prevState,
      [key]: value
    }))
  }

  const { price, quote_size, side, product_id, trade_pair_ratio, startingValue, endingValue, increment, incrementType, sizeType, base_size } = limitOrder;

  // inferred values
  const sellPrice = (price * (Number(trade_pair_ratio) + 100)) / 100;
  const priceMargin = sellPrice - price;
  const volumeCostBuy = price * base_size;
  const volumeCostSell = sellPrice * base_size;
  const buyFee = volumeCostBuy * makerFee;
  const sellFee = volumeCostSell * makerFee;
  const totalfees = buyFee + sellFee;
  const pairMargin = volumeCostSell - volumeCostBuy;
  const pairProfit = pairMargin - totalfees;

  function submitTransaction(event) {
    event.preventDefault();
    // calculate flipped price
    let original_sell_price = (Math.round((price * (Number(trade_pair_ratio) + 100))) / 100);
    let type = false;
    if (currentPrice < price) {
      type = 'market';
    }
    createOrderPair({
      original_sell_price: original_sell_price,
      original_buy_price: price,
      side: side,
      limit_price: price,
      base_size: base_size,
      product_id: productID,
      trade_pair_ratio: trade_pair_ratio,
      type: type
    })
  }



  return (
    <div className="Trade scrollable boxed" >
      {/* form for setting up individual trade-pairs */}
      <form className="new-trade-form" onSubmit={submitTransaction} >
        <div className="number-inputs">
          {/* input for setting the price/BTC per transaction. Can be adjusted in $500 steps, or manually input */}
          <label htmlFor="transaction_price">
            Trade price per 1 {base_currency_id} (in {quote_currency_id}): <button className={`btn-blue ${user.theme}`} onClick={(event) => {
              // get the current price of the product and set it as the price
            }}> Get Current (rounded)</button>
          </label>
          <input
            className={user.theme}
            type="number"
            name="transaction_price"
            value={Number(price)}
            // todo - this could possibly be changed to 100, or add a selector menu thing to toggle between different amounts
            // step={1}
            required
            onChange={(event) => { changeLimitOrder('price', Number(event.target.value)) }}
          />

          <IncrementButtons
            firstButton={quote_increment * 10}
            roundTo={quote_inverse_increment}
            currentValue={price}
            changeValue={(value) => { changeLimitOrder('price', value) }}
            theme={user.theme}
          />
        </div>

        {/* INPUT FOR AMOUNT IN BTC */}
        {!amountType === 'quote'
          ? <div className="number-inputs">
            {/* input for setting how much bitcoin should be traded per transaction at the specified price */}
            <label htmlFor="transaction_amount">
              Trade amount in {base_currency_id}:
              <button className={`btn-blue ${user.theme}`} onClick={(event) => setAmountType(true)}>Switch</button>
            </label>
            <input
              className={user.theme}
              type="number"
              name="transaction_amount"
              value={Number(
                // size
              )}
              // step={0.001}
              required
              onChange={(event) => { changeLimitOrder('base_size', Number(event.target.value)) }}
            />
            <IncrementButtons
              firstButton={base_increment * 10000}
              roundTo={base_inverse_increment}
              currentValue={1
                // size
              }
              // changeValue={
              // handleTransactionAmount
              // }
              theme={user.theme}
            />
          </div>

          /* INPUT FOR AMOUNT IN USD */
          : <div className="number-inputs">
            {/* input for setting how much bitcoin should be traded per transaction at the specified price */}
            <label htmlFor="transaction_amount">
              Trade amount in {quote_currency_id}:
              <button className={`btn-blue ${user.theme}`} onClick={(event) => setAmountType(false)}>Switch</button>
            </label>
            <input
              className={user.theme}
              type="number"
              name="transaction_amount"
              value={Number(
                // size
              )}
              // step={0.001}
              required
              onChange={(event) => { changeLimitOrder('quote_size', Number(event.target.value)) }}
            />
            <IncrementButtons
              firstButton={quote_increment * 10}
              roundTo={quote_inverse_increment}
              currentValue={1
                // size
              }
              // changeValue={
              // handleTransactionAmount
              // }
              theme={user.theme}
            />
          </div>
        }


        <div className="number-inputs">
          {/* input for setting how much bitcoin should be traded per transaction at the specified price */}
          <label htmlFor="trade-pair-ratio">
            Trade pair percent increase:
          </label>
          <input
            className={user.theme}
            type="number"
            name="trade-pair-ratio"
            value={Number(trade_pair_ratio)}
            step={0.001}
            required
            onChange={(event) => setLimitOrder({
              ...limitOrder,
              trade_pair_ratio: Number(event.target.value)
            })}
          />
          <IncrementButtons
            firstButton={0.001}
            roundTo={3}
            currentValue={trade_pair_ratio}
            changeValue={(value) => setLimitOrder({
              ...limitOrder,
              trade_pair_ratio: value
            })}
            theme={user.theme}
          />
          <input className={`btn-send-trade btn-blue ${user.theme}`} type="submit" name="submit" value="Start New Trade-Pair" />
        </div>


        {/* display some details about the new transaction that is going to be made */}
        <div className={`boxed dark ${user.theme}`}>
          <h4 className={`title ${user.theme}`}>New position</h4>
          <p><strong>Trade Pair Details:</strong></p>
          <p className="info">Buy price: <strong>${numberWithCommas(Number(price)?.toFixed(quote_inverse_increment))}</strong> </p>
          <p className="info">Sell price <strong>${numberWithCommas(price?.toFixed(quote_inverse_increment))}</strong></p>
          <p className="info">Price margin: <strong>{numberWithCommas(priceMargin?.toFixed(quote_inverse_increment))}</strong> </p>
          <p className="info">Volume <strong>{base_size}</strong> </p>
          <p><strong>Cost at this volume:</strong></p>
          <p className="info"><strong>BUY*:</strong> ${numberWithCommas(volumeCostBuy?.toFixed(quote_inverse_increment))}</p>
          <p className="info"><strong>SELL*:</strong>${numberWithCommas(volumeCostSell?.toFixed(quote_inverse_increment))}</p>
          <p className="info"><strong>BUY FEE*:</strong> ${buyFee?.toFixed(8)}</p>
          <p className="info"><strong>SELL FEE*:</strong> ${sellFee?.toFixed(8)}</p>
          <p className="info"><strong>TOTAL FEES*:</strong> ${totalfees?.toFixed(8)}</p>
          <p className="info"><strong>PAIR MARGIN*:</strong> ${numberWithCommas(pairMargin?.toFixed(8))}</p>
          <p className="info"><strong>PAIR PROFIT*:</strong> ${numberWithCommas(pairProfit?.toFixed(8))}</p>
          <p className="small info">
            *Costs, fees, margins, and profits, are estimated and may be different at the time of transaction.
            This is mostly due to rounding issues and market conditions.
          </p>
        </div>
      </form>
      {/* </div> */}



      {/* 
      <div className={`Trade scrollable boxed collapsed`} >
        <button className={`btn-blue btn-collapse ${user.theme}`} onClick={toggleCollapse} >&#9654;<br />&#9654;<br />&#9654;</button>
        <button className={`btn-blue btn-collapse ${user.theme}`} onClick={toggleCollapse} >&#9654;<br/><br/>&#9654;<br/><br/>&#9654;</button>
      </div> */}

    </div>
  );
}

export default LimitOrder;
