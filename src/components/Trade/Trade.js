import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './Trade.css';


function Trade(props) {

  // todo - default price value should automatically start out at the current price
  // of bitcoin, rounded to the closest $100
  const [transactionSide, setTransactionSide] = useState('BUY');
  const [price, setTransactionPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [priceMargin, setPriceMargin] = useState(0);
  const [pairMargin, setPairMargin] = useState(0);
  const [pairProfit, setPairProfit] = useState(0);
  const [volumeCostBuy, setVolumeCostBuy] = useState(0);
  const [volumeCostSell, setVolumeCostSell] = useState(0);
  const [transactionAmountBTC, setTransactionAmountBTC] = useState(0.001);
  const [transactionAmountUSD, setTransactionAmountUSD] = useState(10);
  const [transactionProduct, setTransactionProduct] = useState('BTC-USD');
  const [tradePairRatio, setTradePairRatio] = useState(1.1);
  const [fees, setFees] = useState(0.005);
  const [buyFee, setBuyFee] = useState(0.005);
  const [sellFee, setSellFee] = useState(0.005);
  const [totalfees, setTotalFees] = useState(0.005);
  const [amountTypeIsUSD, setAmountTypeIsUSD] = useState(true);

  const [tradeType, setTradeType] = useState(true);
  const [basicAmount, setBasicAmount] = useState(0);
  const [basicSide, setBasicSide] = useState('BUY');
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);

  // taken from https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  const numberWithCommas = (x) => {
    // this will work in safari once lookbehind is supported
    // return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
    // for now, use this
    let parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  // calculate New Position values every time a number in the calculator changes
  useEffect(() => {

    let sellPrice = (price * (tradePairRatio + 100)) / 100;
    let priceMargin = sellPrice - price;
    let volumeCostBuy = price * transactionAmountBTC;
    let volumeCostSell = sellPrice * transactionAmountBTC;
    let buyFee = volumeCostBuy * fees;
    let sellFee = volumeCostSell * fees;
    let totalfees = buyFee + sellFee;
    let pairMargin = volumeCostSell - volumeCostBuy;
    let pairProfit = pairMargin - totalfees;

    setSellPrice(sellPrice);
    setPriceMargin(priceMargin);
    setVolumeCostBuy(volumeCostBuy);
    setVolumeCostSell(volumeCostSell);
    setBuyFee(buyFee);
    setSellFee(sellFee);
    setTotalFees(totalfees);
    setPairMargin(pairMargin);
    setPairProfit(pairProfit);

  }, [price, transactionAmountBTC, transactionAmountUSD, tradePairRatio, amountTypeIsUSD]);


  function submitTransaction(event) {
    event.preventDefault();
    // calculate flipped price
    let original_sell_price = (Math.round((price * (Number(tradePairRatio) + 100))) / 100);
    let type = false;
    if (props.priceTicker < price) {
      type = 'market';
    }
    dispatch({
      type: 'START_TRADE', payload: {
        original_sell_price: original_sell_price,
        original_buy_price: price,
        side: transactionSide,
        price: price,
        base_size: transactionAmountBTC,
        product_id: transactionProduct,
        trade_pair_ratio: tradePairRatio,
        type: type
      }
    })
  }

  function submitBasicTransaction(event) {
    event.preventDefault();
    console.log('BASIC TRADE STARTED');
    dispatch({
      type: 'START_BASIC_TRADE', payload: {
        type: "market",
        base_size: basicAmount,
        product_id: transactionProduct,
        side: basicSide
      }
    })
  }

  const getCurrentPrice = useCallback(
    (event) => {
      if (event) {
        event.preventDefault();
      }
      // check if the current price has been stored yet to prevent NaN errors
      if (props.priceTicker) {
        // round the price to nearest 100
        const roundedPrice = Math.round(props.priceTicker / 100) * 100;
        // change input box to reflect rounded value
        setTransactionPrice(roundedPrice)
      }
    }, [setTransactionPrice, props.priceTicker]
  )


  // when the page loads, get the current price
  useEffect(() => {
    if (price === 0) {
      getCurrentPrice();
    }
  }, [getCurrentPrice, price])

  // once the account fees load into redux, 
  useEffect(() => {
    setFees(user.maker_fee)
  }, [user])

  function amountTypeHandler(event, type) {
    if (event) {
      event.preventDefault();
    }
    setAmountTypeIsUSD(type);
    if (type === true) {
      const newUSDAmount = Math.round(price * transactionAmountBTC)
      setTransactionAmountUSD(newUSDAmount)
      const convertedAmount = Number(Math.floor((newUSDAmount / price) * 100000000)) / 100000000;
      setTransactionAmountBTC(convertedAmount);
    } else {
      setTransactionAmountBTC(Math.floor(transactionAmountBTC * 10000) / 10000)
    }
  }

  function handleTransactionAmount(amount) {
    if (amountTypeIsUSD) {
      setTransactionAmountUSD(amount)
      // setTransactionAmountBTC(Math.floor(price / amount * 1000) / 1000)
      const convertedAmount = Number(Math.floor((amount / price) * 100000000)) / 100000000;
      setTransactionAmountBTC(convertedAmount);
    }
    if (!amountTypeIsUSD) {
      // setTransactionAmountBTC(Math.floor(amount *100000000) / 100000000)
      setTransactionAmountBTC(amount)
      setTransactionAmountUSD(Number(Math.round(price * amount * 100) / 100))
    }
  }

  // function to set amount in BTC if USD inputs are being used
  useEffect(() => {
    if (amountTypeIsUSD) {
      const convertedAmount = Number((transactionAmountUSD / price) * 100000000) / 100000000;
      setTransactionAmountBTC(Math.floor(convertedAmount * 100000000) / 100000000);
    }
    if (!amountTypeIsUSD) {
      setTransactionAmountBTC(Math.floor(transactionAmountBTC * 10000) / 10000)
      // setTransactionAmountUSD(Math.round(price * transactionAmountBTC * 100) / 100)
    }
  }, [price])

  function toggleTradeType() {
    setTradeType(!tradeType);
  }


  return (

    tradeType
      ? <div className="Trade scrollable boxed" >
        {/* <div className="scrollable boxed"> */}
        <h3 className={`title ${user.theme}`}>New Trade-Pair <button className={`btn-blue ${user.theme}`} onClick={toggleTradeType} >Switch</button></h3>
        {/* form with a single input. Input takes a price point at which 
          to make a trade */}
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
            <div className="increment-buttons">
              <div className="increase">
                <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => setTransactionPrice(Number(price) + 10000)} value="+10000"></input>
                <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => setTransactionPrice(Number(price) + 1000)} value="+1000"></input>
                <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => setTransactionPrice(Number(price) + 100)} value="+100"></input>
                <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => setTransactionPrice(Number(price) + 10)} value="+10"></input>
              </div>
              <div className="decrease">
                <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => setTransactionPrice(Number(price) - 10000)} value="-10000"></input>
                <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => setTransactionPrice(Number(price) - 1000)} value="-1000"></input>
                <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => setTransactionPrice(Number(price) - 100)} value="-100"></input>
                <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => setTransactionPrice(Number(price) - 10)} value="-10"></input>
              </div>
            </div>
          </div>

          {/* INPUT FOR AMOUNT IN BTC */}
          {!amountTypeIsUSD
            ? <div className="number-inputs">
              {/* input for setting how much bitcoin should be traded per transaction at the specified price */}
              <label htmlFor="transaction_amount">
                Trade amount (in BTC):
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
              <div className="increment-buttons">
                <div className="increase">
                  <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountBTC) * 10000 + 1000) / 10000)} value="+.100"></input>
                  <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountBTC) * 10000 + 100) / 10000)} value="+.010"></input>
                  <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountBTC) * 10000 + 10) / 10000)} value="+.001"></input>
                  <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountBTC) * 10000 + 1) / 10000)} value="+.0001"></input>
                </div>
                <div className="decrease">
                  <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountBTC) * 10000 - 1000) / 10000)} value="-.100"></input>
                  <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountBTC) * 10000 - 100) / 10000)} value="-.010"></input>
                  <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountBTC) * 10000 - 10) / 10000)} value="-.001"></input>
                  <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountBTC) * 10000 - 1) / 10000)} value="-.0001"></input>
                </div>
              </div>
            </div>

            /* INPUT FOR AMOUNT IN USD */
            : <div className="number-inputs">
              {/* input for setting how much bitcoin should be traded per transaction at the specified price */}
              <label htmlFor="transaction_amount">
                Trade amount (in USD):
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
              <div className="increment-buttons">
                <div className="increase">
                  <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountUSD) * 10000 + 10000000) / 10000)} value="+1000"></input>
                  <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountUSD) * 10000 + 1000000) / 10000)} value="+100"></input>
                  <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountUSD) * 10000 + 100000) / 10000)} value="+10"></input>
                  <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountUSD) * 10000 + 10000) / 10000)} value="+1"></input>
                </div>
                <div className="decrease">
                  <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountUSD) * 10000 - 10000000) / 10000)} value="-1000"></input>
                  <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountUSD) * 10000 - 1000000) / 10000)} value="-100"></input>
                  <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountUSD) * 10000 - 100000) / 10000)} value="-10"></input>
                  <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => handleTransactionAmount(Math.round(Number(transactionAmountUSD) * 10000 - 10000) / 10000)} value="-1"></input>
                </div>
              </div>
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
              value={Number(tradePairRatio)}
              step={0.001}
              required
              onChange={(event) => setTradePairRatio(Number(event.target.value))}
            />
            <div className="increment-buttons">
              <div className="increase">
                <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => setTradePairRatio(Math.round(Number(tradePairRatio) * 1000 + 1000) / 1000)} value="+1"></input>
                <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => setTradePairRatio(Math.round(Number(tradePairRatio) * 1000 + 100) / 1000)} value="+0.1"></input>
                <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => setTradePairRatio(Math.round(Number(tradePairRatio) * 1000 + 10) / 1000)} value="+0.01"></input>
                <input type="button" className={`btn-green ${user.theme}`} onClick={(event) => setTradePairRatio(Math.round(Number(tradePairRatio) * 1000 + 1) / 1000)} value="+0.001"></input>

              </div>
              <div className="decrease">
                <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => setTradePairRatio(Math.round(Number(tradePairRatio) * 1000 - 1000) / 1000)} value="-1"></input>
                <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => setTradePairRatio(Math.round(Number(tradePairRatio) * 1000 - 100) / 1000)} value="-0.1"></input>
                <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => setTradePairRatio(Math.round(Number(tradePairRatio) * 1000 - 10) / 1000)} value="-0.01"></input>
                <input type="button" className={`btn-red ${user.theme}`} onClick={(event) => setTradePairRatio(Math.round(Number(tradePairRatio) * 1000 - 1) / 1000)} value="-0.001"></input>
              </div>
            </div>
            <input className={`btn-send-trade btn-blue ${user.theme}`} type="submit" name="submit" value="Start New Trade-Pair" />
          </div>


          {/* display some details about the new transaction that is going to be made */}
          <div className={`boxed dark ${user.theme}`}>
            <h4 className={`title ${user.theme}`}>New position</h4>
            <p><strong>Trade Pair Details:</strong></p>
            <p className="info">Buy price: <strong>${numberWithCommas(price.toFixed(2))}</strong> </p>
            <p className="info">Sell price <strong>${numberWithCommas(sellPrice.toFixed(2))}</strong></p>
            <p className="info">Price margin: <strong>{numberWithCommas(priceMargin.toFixed(2))}</strong> </p>
            <p className="info">Volume <strong>{transactionAmountBTC}</strong> </p>
            <p><strong>Cost at this volume:</strong></p>
            <p className="info"><strong>BUY*:</strong> ${numberWithCommas(volumeCostBuy.toFixed(2))}</p>
            <p className="info"><strong>SELL*:</strong>${numberWithCommas(volumeCostSell.toFixed(2))}</p>
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





      : <div className="Trade scrollable boxed" >
        {/* <div className="scrollable boxed"> */}
        <h3 className={`title ${user.theme}`}>Basic Trade <button className={`btn-blue ${user.theme}`} onClick={toggleTradeType} >Switch</button></h3>
        {/* form with a single input. Input takes a price point at which 
        to make a trade */}

        <form className="basic-trade-form" onSubmit={submitBasicTransaction} >

          <input className={`btn-green ${user.theme}`} onClick={(event) => setBasicSide('BUY')} type="button" name="submit" value="BUY" />
          <input className={`btn-red ${user.theme}`} onClick={(event) => setBasicSide('SELL')} type="button" name="submit" value="SELL" />
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
          <br />
          <input className={`btn-send-trade btn-blue ${user.theme}`} type="submit" name="submit" value="Send Trade" />
        </form>

        {/* </div> */}
      </div>
  );
}


export default Trade;
