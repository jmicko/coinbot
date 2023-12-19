import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
// import { useSocket } from '../../contexts/SocketProvider';
import IncrementButtons from './IncrementButtons';
import useWindowDimensions from '../../hooks/useWindowDimensions';
import { numberWithCommas, tNum, no, fixedRound } from '../../shared';
// import { useUser } from '../../contexts/UserContext';
// import { useData } from '../../contexts/DataContext';
import { EventType } from '../../types';
import { useUser } from '../../contexts/useUser';
import { useData } from '../../contexts/useData';

interface LimitOrderProps {
  toggleCollapse: () => void;
  toggleTradeType: (e: EventType) => void;
}

function LimitOrder(props: LimitOrderProps) {
  // contexts
  const { maker_fee, theme, btnColor } = useUser();
  // const { currentPrice } = useSocket();
  const currentPrice = 20;
  const { productID, currentProduct, createOrderPair } = useData();

  // hooks
  const { width } = useWindowDimensions();

  // state
  const [priceLoaded, setPriceLoaded] = useState<boolean>(false);
  interface LimitOrderState {
    side: string;
    price: number;
    quote_size: number;
    base_size: number;
    sizeType: string;
    trade_pair_ratio: number;
  }
  const [limitOrder, setLimitOrder] = useState<LimitOrderState>({
    side: 'BUY',
    price: 1,
    quote_size: 10,
    base_size: 1,
    sizeType: 'quote',
    trade_pair_ratio: 5
  });

  // destructuring
  const {
    base_currency_id,
    quote_currency_id,
    quote_increment,
    base_increment,
    // quote_inverse_increment,
    base_increment_decimals,
    quote_increment_decimals,
    price_rounding
  } = currentProduct || {};

  // props
  const toggleCollapse = props.toggleCollapse;
  // const toggleTradeType = props.toggleTradeType;

  // functions
  // change limitOrder function that takes in a key and value and sets the limitOrder state
  function changeLimitOrder(key: string, value: number | string) {
    setLimitOrder(prevState => ({
      ...prevState,
      [key]: value
    }))
  }

  const { price, quote_size, side, trade_pair_ratio, sizeType, base_size } = limitOrder;

  // inferred values
  const sellPriceNR: number = (price * (Number(trade_pair_ratio) + 100)) / 100;
  const sellPrice: number = Number(sellPriceNR.toFixed(quote_increment_decimals));
  const priceMarginNR: number = sellPrice - price;
  const priceMargin: number = Number(priceMarginNR.toFixed(quote_increment_decimals));
  const volumeCostBuyNR: number = price * base_size;
  const volumeCostBuy: number = Number(volumeCostBuyNR.toFixed(quote_increment_decimals));
  const volumeCostSellNR: number = sellPrice * base_size;
  const volumeCostSell: number = Number(volumeCostSellNR.toFixed(quote_increment_decimals));
  const buyFee: number = volumeCostBuy * maker_fee;
  const sellFee: number = volumeCostSell * maker_fee;
  const totalfees: number = buyFee + sellFee;
  const pairMargin: number = volumeCostSell - volumeCostBuy;
  const pairProfit: number = pairMargin - totalfees;

  const getCurrentPrice = useCallback(() => {
    if (currentPrice) {
      // console.log(price_rounding, 'price_rounding')
      // const newPrice = Number(currentPrice).toFixed(price_rounding);
      const newPrice = fixedRound(currentPrice, price_rounding || 2);
      changeLimitOrder('price', newPrice);

    }
  }, [currentPrice, price_rounding])



  // when the page loads, get the current price when it loads and set the price to that if it hasn't been set yet
  useEffect(() => {
    if (!priceLoaded && currentPrice) {
      setPriceLoaded(true);
      getCurrentPrice();
    }
  }, [currentPrice, priceLoaded, getCurrentPrice])

  // when the size changes, update the quote size and base size based on the sizeType
  const sizeTypeRef = useRef(sizeType);
  useEffect(() => { sizeTypeRef.current = sizeType }, [sizeType]);

  useEffect(() => {
    if (!price) return;
    if (sizeType === 'quote') {
      const newBaseSize: number = Number((quote_size / price).toFixed(base_increment_decimals));
      if (newBaseSize === base_size) return;
      // console.log('newBaseSize', newBaseSize, quote_size, 'quote_size', price, 'price', base_increment_decimals, 'base_increment_decimals')
      changeLimitOrder('base_size', newBaseSize);
    } else {
      const newQuoteSize = (base_size * price).toFixed(quote_increment_decimals);
      changeLimitOrder('quote_size', newQuoteSize);
    }
  }, [base_size, price, quote_size, sizeType, base_increment_decimals, quote_increment_decimals])


  function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // calculate flipped price
    const original_sell_price = (((price * (Number(trade_pair_ratio) + 100))) / 100);
    // let type = false;
    // if (currentPrice < price) {
    //   type = 'market';
    // }
    createOrderPair({
      original_sell_price: original_sell_price,
      original_buy_price: price,
      side: side,
      limit_price: price,
      base_size: base_size,
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
          value={'market'}
          onClick={props.toggleTradeType}
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
            firstButton={Number(quote_increment) * 10}
            roundTo={quote_increment_decimals || 2}
            currentValue={Number(price)}
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
            firstButton={Number(base_increment) * 100000}
            roundTo={base_increment_decimals || 2}
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
              trade_pair_ratio: Number(value)
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
