import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './AutoSetup.css'


function AutoSetup(props) {
  const dispatch = useDispatch();

  const [startingValue, setStartingValue] = useState(1000);
  const [increment, setIncrement] = useState(100);
  const [size, setSize] = useState(10);
  const [sizeType, setSizeType] = useState('USD');
  const [transactionProduct, setTransactionProduct] = useState('BTC-USD');
  const [tradePairRatio, setTradePairRatio] = useState(1.1);
  const [setupResults, setSetupResults] = useState(1);
  const [autoTradeStarted, setAutoTradeStarted] = useState(false);
  const [totalTrades, setTotalTrades] = useState(false);

  const [availableFundsUSD, setAvailableFundsUSD] = useState(0);
  const [availableFundsBTC, setAvailableFundsBTC] = useState(0);

  // const [keepTrading, setKeepTrading] = useState(false);


  useEffect(() => {
    if (size) {
      calculateResults();
    }
  }, [startingValue, increment, size, sizeType, props.priceTicker])

  // useEffect(() => {
  //   if (props.store.accountReducer.accountReducer) {
  //     let USD = props.store.accountReducer.accountReducer.filter(account => account.currency === 'USD');
  //     setAvailableFundsUSD(USD[0]);
  //   }
  // }, [props.store.accountReducer.accountReducer]);

  useEffect(() => {
    if (props.store.accountReducer.accountReducer) {
      let USD = props.store.accountReducer.accountReducer.filter(account => account.currency === 'USD');
      setAvailableFundsUSD(USD[0]);
      let BTC = props.store.accountReducer.accountReducer.filter(account => account.currency === 'BTC');
      setAvailableFundsBTC(BTC[0]);
    }
  }, [props.store.accountReducer.accountReducer]);

  // taken from https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
  }

  function calculateResults() {
    let availableFunds = availableFundsUSD.available;

    // this is the current price point that the loop is working with
    let loopPrice = startingValue;

    // this is the price BTC is currently trading at
    let tradingPrice = props.priceTicker;

    // this is how many times the loop has looped
    let count = 0;

    // setSetupResults(startingValue)

    if (sizeType === "USD") {
      // logic for when size is in USD
      while ((size <= availableFunds) && (count < 10000)) {
        let actualSize = size;

        // if the loop price is higher than the trading price,
        // need to find actual cost of the trade at that volume
        if (loopPrice >= tradingPrice) {
          // convert size at loop price to BTC
          let BTCSize = size / loopPrice;
          // find cost of BTCSize at current price
          let actualUSDSize = tradingPrice * BTCSize;
          // set the actual USD size to be the cost of the BTC size at the current trade price
          actualSize = actualUSDSize;
        }
        // each loop needs to buy BTC with the USD size
        // this will lower the value of available funds by the size
        availableFunds -= actualSize;
        // then it will increase the final price by the increment value
        setSetupResults(loopPrice);
        loopPrice += increment;
        count++;
      }
      setTotalTrades(count);
    } else {
      // logic for when size is in btc
    }
  }


  function submitAutoSetup(event) {
    event.preventDefault();
    setAutoTradeStarted(true);
    console.log('automatically setting up bot');
    autoTrader();
  }

  function changeSizeType(event) {
    event.preventDefault();
    if (sizeType === "USD") {
      setSizeType("BTC");
      setSize(0.01);
    } else {
      setSizeType("USD");
      setSize(10);
    }
  }

  function autoTrader() {
    let availableFunds = availableFundsUSD.available;
    console.log('here is the current available funds', availableFunds);

    dispatch({
      type: 'AUTO_SETUP', payload: {
        startingValue: startingValue,
        increment: increment,
        trade_pair_ratio: tradePairRatio,
        size: size,
        sizeType: sizeType,
        product_id: transactionProduct,
      }
    })
  }

  return (
    <div className="AutoSetup settings-panel scrollable">
      <div className="divider" />
      <h4>Auto Setup</h4>
      <p>{props.priceTicker} avail {availableFundsUSD.available}</p>
      <p>
        Enter the parameters you want and the bot will keep placing trades for you based on
        those parameters until you run out of cash, or until you have 10,000 trade-pairs.
        This is much easier than manually placing dozens of trades if they are following a basic pattern.
      </p>
      <p>
        Please be aware that the bot will slow down slightly with every 999 trades.
      </p>

      <div className="divider" />
      <div className='auto-setup-form-and-results'>

        <form className='auto-setup-form' onSubmit={submitAutoSetup}>

          {/* STARTING VALUE */}
          <p>What dollar amount to start at?</p>
          <label htmlFor='startingValue'>
            Starting Value:
            <br />
            <input
              name='startingValue'
              type='number'
              value={startingValue}
              step={1000}
              required
              onChange={(event) => setStartingValue(Number(event.target.value))}
            />
          </label>

          {/* INCREMENT */}
          <p>What dollar amount to increment by?</p>
          <label htmlFor='increment'>
            Increment:
            <br />
            <input
              name='increment'
              type='number'
              value={increment}
              required
              onChange={(event) => setIncrement(Number(event.target.value))}
            />
          </label>

          {/* RATIO */}
          <p>What is the trade-pair ratio (how much each BUY should increase in price before selling)?</p>
          <label htmlFor='ratio'>
            Trade-pair ratio:
            <br />
            <input
              name='ratio'
              type='number'
              value={tradePairRatio}
              required
              onChange={(event) => setTradePairRatio(Number(event.target.value))}
            />
          </label>

          {/* SIZE */}
          <p>What size in {sizeType === "USD" ? "USD" : "BTC"} should each trade-pair be? {sizeType === "USD"
            ? <button className={`btn-blue ${props.theme}`} onClick={changeSizeType}> Change to BTC</button>
            : <button className={`btn-blue ${props.theme}`} onClick={changeSizeType}> Change to USD</button>
          }</p>

          <label htmlFor='size'>
            Size in {sizeType === "USD" ? "USD" : "BTC"}:
            <br />
            <input
              name='size'
              type='number'
              value={size}
              step={.01}
              required
              onChange={(event) => setSize(Number(event.target.value))}
            />
          </label>

          {/* SUBMIT */}
          <br />
          <br />
          {!autoTradeStarted
            ? <input className={`btn-store-api btn-blue medium ${props.theme}`} type="submit" name="submit" value="Start Trading" />
            : <p>Auto setup started!</p>
          }
        </form>

        <div className='auto-setup-results'>
          <p>
            The price of the last trade-pair will be close to:
          </p>
          <p>
            <strong>{numberWithCommas(setupResults.toFixed(2))}</strong>
          </p>
          <p>
            This calculation isn't perfect but it will get close. It can also change if the price of BTC moves up or down significantly while the
            trades are being set up.
          </p>
          <p>
            Approximate number of trades the setup process will create:
          </p>
          <p>
            <strong>{numberWithCommas(totalTrades)}</strong>
          </p>
          <p>
            However, there is a total limit of 10,000 trades placed per user. Latency may cause it to
            create more, in which case you got lucky.
          </p>

        </div>
      </div>

      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(AutoSetup);