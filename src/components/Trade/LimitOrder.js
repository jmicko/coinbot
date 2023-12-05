import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '../../contexts/SocketProvider.js';
import IncrementButtons from './IncrementButtons.js';
import useWindowDimensions from '../../hooks/useWindowDimensions.js';
import { numberWithCommas, tNum, no, fixedRound } from '../../shared.js';
import { useUser } from '../../contexts/UserContext.js';
import { useData } from '../../contexts/DataContext.js';


function LimitOrder(props) {
  // contexts
  const { user, makerFee, theme, btnColor } = useUser();
  const { currentPrice } = useSocket();
  const { productID, currentProduct, createOrderPair } = useData();

  // hooks
  const { width } = useWindowDimensions();

  // state
  const [priceLoaded, setPriceLoaded] = useState(false);
  const [limitOrder, setLimitOrder] = useState({
    side: 'BUY',
    price: null,
    quote_size: 10,
    base_size: null,
    sizeType: 'quote',
    trade_pair_ratio: 5
  });

  // destructuring
  const { base_currency_id, quote_currency_id, quote_increment, base_increment, quote_inverse_increment,
    base_increment_decimals, quote_increment_decimals, price_rounding } = currentProduct;

  // props
  const toggleCollapse = props.toggleCollapse;
  const toggleTradeType = props.toggleTradeType;
  
  // functions
  // change limitOrder function that takes in a key and value and sets the limitOrder state
  function changeLimitOrder(key, value) {
    setLimitOrder(prevState => ({
      ...prevState,
      [key]: value
    }))
  }
  
  const { price, quote_size, side, trade_pair_ratio, sizeType, base_size } = limitOrder;

  // inferred values
  const sellPriceNR = (price * (Number(trade_pair_ratio) + 100)) / 100;
  const sellPrice = sellPriceNR.toFixed(quote_increment_decimals);
  const priceMarginNR = sellPrice - price;
  const priceMargin = priceMarginNR.toFixed(quote_increment_decimals);
  const volumeCostBuyNR = price * base_size;
  const volumeCostBuy = volumeCostBuyNR.toFixed(quote_increment_decimals);
  const volumeCostSellNR = sellPrice * base_size;
  const volumeCostSell = volumeCostSellNR.toFixed(quote_increment_decimals);
  const buyFee = volumeCostBuy * makerFee;
  const sellFee = volumeCostSell * makerFee;
  const totalfees = buyFee + sellFee;
  const pairMargin = volumeCostSell - volumeCostBuy;
  const pairProfit = pairMargin - totalfees;

  const getCurrentPrice = useCallback(() => {
    if (currentPrice) {
      // console.log(price_rounding, 'price_rounding')
      // const newPrice = Number(currentPrice).toFixed(price_rounding);
      const newPrice = fixedRound(currentPrice, price_rounding);
      changeLimitOrder('price', newPrice);

    }
  }, [currentPrice, price_rounding])



  // when the page loads, get the current price when it loads and set the price to that if it hasn't been set yet
  useEffect(() => {
    if (!priceLoaded && currentPrice) {
      setPriceLoaded(true);
      getCurrentPrice();
    }
  }, [currentPrice, priceLoaded])

  // when the size changes, update the quote size and base size based on the sizeType
  const sizeTypeRef = useRef(sizeType);
  useEffect(() => { sizeTypeRef.current = sizeType }, [sizeType]);

  useEffect(() => {
    if (!price) return;
    if (sizeType === 'quote') {
      const newBaseSize = (quote_size / price).toFixed(base_increment_decimals);
      if (newBaseSize === base_size) return;
      console.log('newBaseSize', newBaseSize, quote_size, 'quote_size', price, 'price', base_increment_decimals, 'base_increment_decimals')
      changeLimitOrder('base_size', newBaseSize);
    } else {
      const newQuoteSize = (base_size * price).toFixed(quote_increment_decimals);
      changeLimitOrder('quote_size', newQuoteSize);
    }
  }, [base_size, price, quote_size, sizeType])


  function submitTransaction(event) {
    event.preventDefault();
    // calculate flipped price
    let original_sell_price = (((price * (Number(trade_pair_ratio) + 100))) / 100);
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
      product_id: productID,
    })
  }


  return (
    <div className="Trade scrollable boxed" >
      <h3 className={`title ${theme}`}>
        {width > 800
          && <button
            className={`${btnColor} ${theme}`}
            onClick={toggleCollapse} >&#9664;</button>
        } New Trade-Pair <button
          className={`${btnColor} ${theme}`}
          onClick={toggleTradeType}
        >Switch</button>
      </h3>
      {/* form for setting up individual trade-pairs */}
      <form className="new-trade-form" onSubmit={submitTransaction} >
        <div className="number-inputs">
          {/* input for setting the price/BTC per transaction. Can be adjusted in $500 steps, or manually input */}
          <label htmlFor="transaction_price">
            Trade price per 1 {base_currency_id} (in {quote_currency_id}): <button className={`btn-blue ${theme}`} onClick={(e) => {
              no(e);
              getCurrentPrice();
            }}> Get Current (rounded)</button>
          </label>
          <input
            className={theme}
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
            roundTo={quote_increment_decimals}
            currentValue={price}
            changeValue={(value) => { changeLimitOrder('price', Number(value)) }}
            theme={theme}
          />
        </div>

        <label htmlFor="transaction_amount">
          Trade amount in {sizeType === 'quote' ? quote_currency_id : base_currency_id}:
          <button className={`btn-blue ${theme}`} onClick={(e) => {
            no(e);
            // setSizeType(sizeType === 'quote' ? 'base' : 'quote') 
            changeLimitOrder('sizeType', sizeType === 'quote' ? 'base' : 'quote')
          }}>Switch</button>
        </label>

        {/* INPUT FOR AMOUNT */}
        <div className="number-inputs">
          {/* input for setting how much bitcoin should be traded per transaction at the specified price */}
          <input
            className={theme}
            type="number"
            name="transaction_amount"
            value={Number(sizeType === 'quote' ? quote_size : base_size)}
            // step={0.001}
            required
            onChange={(e) => { changeLimitOrder(sizeType === 'quote' ? 'quote_size' : 'base_size', tNum(e)) }}
          />
          <IncrementButtons
            firstButton={base_increment * 100000}
            roundTo={base_increment_decimals}
            currentValue={sizeType === 'quote' ? quote_size : base_size}
            changeValue={(v) => { changeLimitOrder(sizeType === 'quote' ? 'quote_size' : 'base_size', Number(v)) }}
            theme={theme}
          />
        </div>



        <div className="number-inputs">
          {/* input for setting how much bitcoin should be traded per transaction at the specified price */}
          <label htmlFor="trade-pair-ratio">
            Trade pair percent increase:
          </label>
          <input
            className={theme}
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
            theme={theme}
          />
          <input className={`btn-send-trade btn-blue ${theme}`} type="submit" name="submit" value="Start New Trade-Pair" />
        </div>


        {/* display some details about the new transaction that is going to be made */}
        <div className={`boxed dark ${theme}`}>
          <h4 className={`title ${theme}`}>New position</h4>
          <p><strong>Trade Pair Details:</strong></p>
          <p className="info">Buy price: <strong>${numberWithCommas(price)}</strong> </p>
          {/* <p className="info">Sell price <strong>${numberWithCommas(Number(sellPrice)?.toFixed(quote_increment_decimals))}</strong></p> */}
          <p className="info">Sell price <strong>${numberWithCommas(sellPrice)}</strong></p>
          <p className="info">Price margin: <strong>{numberWithCommas(priceMargin)}</strong> </p>
          <p className="info">Volume <strong>{base_size}</strong> </p>
          <p><strong>Cost at this volume*:</strong></p>
          <p className="info"><strong>BUY:</strong> ${numberWithCommas(volumeCostBuy)}</p>
          <p className="info"><strong>SELL:</strong>${numberWithCommas(volumeCostSell)}</p>
          <p className="info"><strong>BUY FEE:</strong> ${buyFee}</p>
          <p className="info"><strong>SELL FEE:</strong> ${sellFee}</p>
          <p className="info"><strong>TOTAL FEES:</strong> ${totalfees?.toFixed(8)}</p>
          <p className="info"><strong>PAIR MARGIN:</strong> ${numberWithCommas(pairMargin?.toFixed(8))}</p>
          <p className="info"><strong>PAIR PROFIT:</strong> ${numberWithCommas(pairProfit?.toFixed(8))}</p>
          <p className="small info">
            *Costs, fees, margins, and profits, are estimated and may be different at the time of transaction.
            This is mostly due to rounding issues and market conditions.
          </p>
        </div>
      </form>
    </div>
  );
}

export default LimitOrder;
