import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketProvider';
import useWindowDimensions from '../../hooks/useWindowDimensions.js';
import './Trade.css';
import IncrementButtons from './IncrementButtons';
import { numberWithCommas } from '../../shared';
import { useUser } from '../../contexts/UserContext';
import { useData } from '../../contexts/DataContext';


function Trade() {
  // console.log('rendering trade');
  // todo - default price value should automatically start out at the current price
  // of bitcoin, rounded to the closest $100
  // const [transactionSide, setTransactionSide] = useState('BUY');
  const transactionSide = 'BUY'
  const [price, setTransactionPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [priceMargin, setPriceMargin] = useState(0);
  const [pairMargin, setPairMargin] = useState(0);
  const [pairProfit, setPairProfit] = useState(0);
  const [volumeCostBuy, setVolumeCostBuy] = useState(0);
  const [volumeCostSell, setVolumeCostSell] = useState(0);
  const [transactionAmountBTC, setTransactionAmountBTC] = useState(0.001);
  const [transactionAmountUSD, setTransactionAmountUSD] = useState(10);
  const [trade_pair_ratio, setTradePairRatio] = useState(1.1);
  const [fees, setFees] = useState(0.005);
  const [buyFee, setBuyFee] = useState(0.005);
  const [sellFee, setSellFee] = useState(0.005);
  const [totalfees, setTotalFees] = useState(0.005);
  const [amountTypeIsUSD, setAmountTypeIsUSD] = useState(true);
  const [tradeType, setTradeType] = useState(true);

  const [collapse, setCollapse] = useState(true);
  const { width } = useWindowDimensions();
  const [basicAmount, setBasicAmount] = useState(0);
  const [basicSide, setBasicSide] = useState('BUY');
  const { user } = useUser();

  const socket = useSocket();
  const [initialPriceSet, setInitialPriceSet] = useState(false);

  // product info for the current product
  const { productID, currentProduct, createOrderPair, createMarketTrade } = useData();
  const currentProductPrice = Number(socket.tickers?.[productID]?.price);
  const {
    price_rounding,
    baseInverseIncrement,
    baseIncrementDecimals,
    quoteIncrementDecimals,
    quote_increment,
    base_currency_id,
    base_increment,
    quote_currency_id
  } = currentProduct;

  // calculate New Position values every time a number in the calculator changes
  useEffect(() => {


    let sellPrice = (price * (Number(trade_pair_ratio) + 100)) / 100;
    let priceMargin = sellPrice - price;
    let volumeCostBuy = price * transactionAmountBTC;
    let volumeCostSell = sellPrice * transactionAmountBTC;
    let buyFee = volumeCostBuy * fees;
    let sellFee = volumeCostSell * fees;
    let totalfees = buyFee + sellFee;
    let pairMargin = volumeCostSell - volumeCostBuy;
    let pairProfit = pairMargin - totalfees;

    // console.log(trade_pair_ratio, 'trade_pair_ratio')
    console.log(price, 'price')
    // console.log(sellPrice, 'sellPrice')


    setSellPrice(sellPrice);
    setPriceMargin(priceMargin);
    setVolumeCostBuy(volumeCostBuy);
    setVolumeCostSell(volumeCostSell);
    setBuyFee(buyFee);
    setSellFee(sellFee);
    setTotalFees(totalfees);
    setPairMargin(pairMargin);
    setPairProfit(pairProfit);

  }, [fees, price, transactionAmountBTC, transactionAmountUSD, trade_pair_ratio, amountTypeIsUSD]);


  function submitTransaction(event) {
    event.preventDefault();
    // calculate flipped price
    let original_sell_price = (Math.round((price * (Number(trade_pair_ratio) + 100))) / 100);
    let type = false;
    if (currentProductPrice < price) {
      type = 'market';
    }

    createOrderPair({
      original_sell_price: original_sell_price,
      original_buy_price: price,
      side: transactionSide,
      limit_price: price,
      base_size: transactionAmountBTC,
      product_id: productID,
      trade_pair_ratio: trade_pair_ratio,
      type: type
    })
  }

  function submitBasicTransaction(event) {
    event.preventDefault();
    console.log('BASIC TRADE STARTED');
    createMarketTrade({
      // type: 'START_BASIC_TRADE', payload: {
      base_size: basicAmount,
      product_id: productID,
      side: basicSide,
      tradingPrice: currentProductPrice
      // }
    })
  }

  // store the current product in a variable
  const getCurrentPrice = useCallback(
    (event) => {
      if (event) {
        event.preventDefault();
      }
      console.log(currentProductPrice, typeof currentProductPrice, price_rounding, 'currentProductPrice')

      if (currentProductPrice && typeof currentProductPrice === 'number') {
        // round the price to nearest 100
        // const roundedPrice = Math.round(socket.tickers[productID].price)
        // const roundedPrice = Math.round(currentProductPrice / 100) * 100;
        // const roundedPrice = currentProductPrice;
        // const roundedPrice = Math.round(currentProductPrice / price_rounding) * price_rounding;
        const roundedPrice = Math.round(currentProductPrice * price_rounding) / price_rounding;
        // console.log(roundedPrice, 'roundedPrice')
        // change input box to reflect rounded value
        setTransactionPrice(roundedPrice)
      }
    }, [setTransactionPrice, currentProductPrice, price_rounding]
  )


  // when the page loads, get the current price
  useEffect(() => {
    if (!initialPriceSet && currentProductPrice) {
      getCurrentPrice();
      setInitialPriceSet(true);
    }
  }, [getCurrentPrice, currentProductPrice, initialPriceSet, setInitialPriceSet])

  // once the account fees load
  useEffect(() => {
    setFees(user.maker_fee)
  }, [user])

  function amountTypeHandler(event, type) {
    if (event) {
      event.preventDefault();
    }
    setAmountTypeIsUSD(type);
    if (!type) {
      setTransactionAmountBTC(Number(transactionAmountBTC).toFixed(baseIncrementDecimals))
    }
  }

  function handleTransactionAmount(amount) {
    if (amountTypeIsUSD) {
      // setTransactionAmountBTC(Math.floor(price / amount * 1000) / 1000)
      setTransactionAmountUSD(Number(amount).toFixed(quoteIncrementDecimals))
      const convertedAmount = Number(Math.floor((amount / price) * baseInverseIncrement)) / baseInverseIncrement;
      setTransactionAmountBTC(convertedAmount);
    }
    if (!amountTypeIsUSD) {
      // setTransactionAmountBTC(Math.floor(amount *100000000) / 100000000)
      setTransactionAmountBTC(Number(amount).toFixed(baseIncrementDecimals))
      setTransactionAmountUSD(Number(price * amount).toFixed(quoteIncrementDecimals))
      // setTransactionAmountUSD(Number(Math.round(price * amount * 100) / 100))
    }
  }


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
        ? <div className="Trade scrollable boxed" >
          <h3 className={`title ${user.theme}`}>{width > 800 && <button className={`btn-blue ${user.theme}`} onClick={toggleCollapse} >&#9664;</button>} New Trade-Pair <button className={`btn-blue ${user.theme}`} onClick={toggleTradeType} >Switch</button></h3>
          {/* form for setting up individual trade-pairs */}
          <form className="new-trade-form" onSubmit={submitTransaction} >
            <div className="number-inputs">
              {/* input for setting the price/BTC per transaction. Can be adjusted in $500 steps, or manually input */}
              <label htmlFor="transaction_price">
                Trade price per 1 BTC (in USD): <button className={`btn-blue ${user.theme}`} onClick={(event) => getCurrentPrice(event)}> Get Current (rounded)</button>
              </label>
              <input
                className={user.theme}
                type="number"
                name="transaction_price"
                value={Number(price)}
                // todo - this could possibly be changed to 100, or add a selector menu thing to toggle between different amounts
                step={1}
                required
                onChange={(event) => setTransactionPrice(Number(event.target.value))}
              />

              <IncrementButtons
                firstButton={quote_increment * 10}
                roundTo={quoteIncrementDecimals}
                currentValue={price}
                changeValue={setTransactionPrice}
                theme={user.theme}
              />
            </div>

            {/* INPUT FOR AMOUNT IN BTC */}
            {!amountTypeIsUSD
              ? <div className="number-inputs">
                {/* input for setting how much bitcoin should be traded per transaction at the specified price */}
                <label htmlFor="transaction_amount">
                  Trade amount in {base_currency_id}:
                  <button className={`btn-blue ${user.theme}`} onClick={(event) => amountTypeHandler(event, true)}>Switch</button>
                </label>
                <input
                  className={user.theme}
                  type="number"
                  name="transaction_amount"
                  value={Number(transactionAmountBTC)}
                  // step={0.001}
                  required
                  onChange={(event) => handleTransactionAmount(event.target.value)}
                />
                <IncrementButtons
                  firstButton={base_increment * 10000}
                  roundTo={baseIncrementDecimals}
                  currentValue={transactionAmountBTC}
                  changeValue={handleTransactionAmount}
                  theme={user.theme}
                />
              </div>

              /* INPUT FOR AMOUNT IN USD */
              : <div className="number-inputs">
                {/* input for setting how much bitcoin should be traded per transaction at the specified price */}
                <label htmlFor="transaction_amount">
                  Trade amount in {quote_currency_id}:
                  <button className={`btn-blue ${user.theme}`} onClick={(event) => amountTypeHandler(event, false)}>Switch</button>
                </label>
                <input
                  className={user.theme}
                  type="number"
                  name="transaction_amount"
                  value={Number(transactionAmountUSD)}
                  // step={0.001}
                  required
                  onChange={(event) => handleTransactionAmount(event.target.value)}
                />
                <IncrementButtons
                  firstButton={quote_increment * 10}
                  roundTo={quoteIncrementDecimals}
                  currentValue={transactionAmountUSD}
                  changeValue={handleTransactionAmount}
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
                onChange={(event) => setTradePairRatio(Number(event.target.value))}
              />
              <IncrementButtons
                firstButton={0.001}
                roundTo={3}
                currentValue={trade_pair_ratio}
                changeValue={setTradePairRatio}
                theme={user.theme}
              />
              <input className={`btn-send-trade btn-blue ${user.theme}`} type="submit" name="submit" value="Start New Trade-Pair" />
            </div>


            {/* display some details about the new transaction that is going to be made */}
            <div className={`boxed dark ${user.theme}`}>
              <h4 className={`title ${user.theme}`}>New position</h4>
              <p><strong>Trade Pair Details:</strong></p>
              <p className="info">Buy price: <strong>${numberWithCommas(Number(price).toFixed(quoteIncrementDecimals))}</strong> </p>
              <p className="info">Sell price <strong>${numberWithCommas(sellPrice.toFixed(quoteIncrementDecimals))}</strong></p>
              <p className="info">Price margin: <strong>{numberWithCommas(priceMargin.toFixed(quoteIncrementDecimals))}</strong> </p>
              <p className="info">Volume <strong>{transactionAmountBTC}</strong> </p>
              <p><strong>Cost at this volume:</strong></p>
              <p className="info"><strong>BUY*:</strong> ${numberWithCommas(volumeCostBuy.toFixed(quoteIncrementDecimals))}</p>
              <p className="info"><strong>SELL*:</strong>${numberWithCommas(volumeCostSell.toFixed(quoteIncrementDecimals))}</p>
              <p className="info"><strong>BUY FEE*:</strong> ${buyFee.toFixed(8)}</p>
              <p className="info"><strong>SELL FEE*:</strong> ${sellFee.toFixed(8)}</p>
              <p className="info"><strong>TOTAL FEES*:</strong> ${totalfees.toFixed(8)}</p>
              <p className="info"><strong>PAIR MARGIN*:</strong> ${numberWithCommas(pairMargin.toFixed(8))}</p>
              <p className="info"><strong>PAIR PROFIT*:</strong> ${numberWithCommas(pairProfit.toFixed(8))}</p>
              <p className="small info">
                *Costs, fees, margins, and profits, are estimated and may be different at the time of transaction.
                This is mostly due to rounding issues and market conditions.
              </p>
            </div>
          </form>
          {/* </div> */}
        </div>





        : <div className={`Trade scrollable boxed ${basicSide}-color`} >

          <h3 className={`title market-order ${user.theme}`}>{width > 800 && <button className={`btn-blue ${user.theme}`} onClick={toggleCollapse} >&#9664;</button>} Market Order <button className={`btn-blue ${user.theme}`} onClick={toggleTradeType} >Switch</button></h3>
          {/* form with a single input. Input takes a price point at which to make a trade */}

          <form className={`basic-trade-form`} onSubmit={submitBasicTransaction} >
            <div className={`basic-trade-buttons`}>
              <input className={`btn-green btn-side ${user.theme}`} onClick={(event) => setBasicSide('BUY')} type="button" name="submit" value="BUY" />
              <input className={`btn-red btn-side ${user.theme}`} onClick={(event) => setBasicSide('SELL')} type="button" name="submit" value="SELL" />
            </div>
            <br />
            <p><strong>
              {
                basicSide === 'BUY'
                  ? 'Buying'
                  : 'Selling'
              }
            </strong>
            </p>

            <label htmlFor="trade-amount">
              Trade volume in BTC:
            </label>
            <br />
            <input
              className={user.theme}
              type="number"
              name="trade-amount"
              value={Number(basicAmount)}
              required
              onChange={(event) => setBasicAmount(Number(event.target.value))}
            />

            {(basicSide === 'SELL') && <input
              className={`btn-blue ${user.theme}`}
              onClick={() => setBasicAmount(Number(user.availableFunds?.[productID].base_available))}
              type="button"
              name="submit"
              value="Max" />}
            <br />
            <p>
              This equates to about
              <br />${numberWithCommas((basicAmount * socket.tickers[productID]?.price).toFixed(2))}
              <br />before fees
            </p>
            <br />
            <input className={`btn-send-trade market btn-blue ${user.theme}`} type="submit" name="submit" value="Send Market Trade" />
          </form>
        </div>
      : <div className={`Trade scrollable boxed collapsed`} >
        <button className={`btn-blue btn-collapse ${user.theme}`} onClick={toggleCollapse} >&#9654;<br />&#9654;<br />&#9654;</button>
        {/* <button className={`btn-blue btn-collapse ${user.theme}`} onClick={toggleCollapse} >&#9654;<br/><br/>&#9654;<br/><br/>&#9654;</button> */}

      </div>
  );
}

export default Trade;
