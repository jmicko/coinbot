import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './AutoSetup.css'


function AutoSetup(props) {
  const dispatch = useDispatch();

  const [startingValue, setStartingValue] = useState(1000);
  const [skipFirst, setSkipFirst] = useState(false);
  const [endingValue, setEndingValue] = useState(100000);
  const [ignoreFunds, setIgnoreFunds] = useState(false);
  const [increment, setIncrement] = useState(100);
  const [incrementType, setIncrementType] = useState('dollars');
  const [size, setSize] = useState(10);
  const [sizeType, setSizeType] = useState('USD');
  const [transactionProduct, setTransactionProduct] = useState('BTC-USD');
  const [tradePairRatio, setTradePairRatio] = useState(1.1);
  const [setupResults, setSetupResults] = useState(1);
  const [autoTradeStarted, setAutoTradeStarted] = useState(false);
  const [totalTrades, setTotalTrades] = useState(false);

  const [availableFundsUSD, setAvailableFundsUSD] = useState(0);
  const [availableFundsBTC, setAvailableFundsBTC] = useState(0);


  function handleIncrementType(event) {
    setIncrementType(event.target.value)
  }

  function handleSkipFirst() {
    setSkipFirst(!skipFirst)
  }

  function handleIgnoreFunds() {
    setIgnoreFunds(!ignoreFunds)
  }

  useEffect(() => {
    if (size) {
      calculateResults();
    }
  }, [startingValue, increment, size, sizeType, props.priceTicker])

  useEffect(() => {
    if (props.store.accountReducer.userReducer) {
      setAvailableFundsUSD(props.store.accountReducer.userReducer.actualavailable_usd);
      setAvailableFundsBTC(props.store.accountReducer.userReducer.actualavailable_btc);
    }
  }, [props.store.accountReducer.userReducer]);

  // taken from https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  const numberWithCommas = (x) => {
    // this will work in safari once lookbehind is supported
    // return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
    // for now, use this
    let parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  function calculateResults() {
    let availableFunds = availableFundsUSD;
    // this is the current price point that the loop is working with
    let loopPrice = startingValue;
    // this is the price BTC is currently trading at
    let tradingPrice = props.priceTicker;
    // this is how many times the loop has looped
    let count = 0;


    let payload = {
      availableFunds: availableFundsUSD,
      tradingPrice: props.priceTicker,
      startingValue: startingValue,
      skipFirst: skipFirst,
      endingValue: endingValue,
      ignoreFunds: ignoreFunds,
      incrementType: incrementType,
      increment: increment,
      trade_pair_ratio: tradePairRatio,
      size: size,
      sizeType: sizeType,
      product_id: transactionProduct,
    }

    let setup = autoSetup(props.store.accountReducer.userReducer, payload);

    // this will be the buy price of the last trade pair
    setSetupResults(setup.orderList[setup.orderList.length - 1].original_buy_price);

    // this will be the total number of trades made
    setTotalTrades(setup.orderList.length);

    console.log(setup);

  }

  function autoSetup(user, parameters) {

    // create an array to hold the new trades to put in
    const orderList = [];
    let count = 0;

    // SHORTEN PARAMS for better readability
    let availableFunds = parameters.availableFunds;
    let size = parameters.size;
    let startingValue = parameters.startingValue;
    let buyPrice = startingValue;
    let endingValue = parameters.endingValue;
    let tradingPrice = parameters.tradingPrice;
    let increment = parameters.increment;
    let incrementType = parameters.incrementType;
    let trade_pair_ratio = parameters.trade_pair_ratio;
    let sizeType = parameters.sizeType;
    let loopDirection = "up";
    if (endingValue - startingValue < 0) {
      loopDirection = "down";
    }

    let btcToBuy = 0;

    // loop until one of the stop triggers is hit
    let stop = false;
    while (!stop) {
      count++;

      buyPrice = Number(buyPrice.toFixed(2));

      // get the sell price with the same math as is used by the bot when flipping
      let original_sell_price = (Math.round((buyPrice * (Number(trade_pair_ratio) + 100))) / 100);

      // figure out if it is going to be a buy or a sell. Buys will be below current trade price, sells above.
      let side = 'buy';
      if (buyPrice > tradingPrice) {
        side = 'sell';
      }

      // set the current price based on if it is a buy or sell
      let price = buyPrice;
      if (side == 'sell') {
        price = original_sell_price;
      }

      // if the size is in BTC, it will never change. 
      let actualSize = size;
      // If it is in USD, need to convert
      if (sizeType == 'USD') {
        // use the buy price and the size to get the real size
        actualSize = Number(Math.floor((size / buyPrice) * 100000000)) / 100000000;
      }

      // count up how much BTC will need to be purchased to reserve for all the sell orders
      if (side == 'sell') {
        btcToBuy += actualSize
      }

      // calculate the previous fees on sell orders
      let prevFees = () => {
        if (side === 'buy') {
          return 0
        } else {
          return buyPrice * actualSize * user.taker_fee
        }
      }


      // CREATE ONE ORDER
      const singleOrder = {
        original_buy_price: buyPrice,
        original_sell_price: original_sell_price,
        side: side,
        price: price,
        size: actualSize,
        fill_fees: prevFees(),
        product_id: parameters.product_id,
        stp: 'cn',
        userID: user.id,
        trade_pair_ratio: parameters.trade_pair_ratio,
      }

      // push that order into the order list
      orderList.push(singleOrder);

      // SETUP FOR NEXT LOOP - do some math to figure out next iteration, and if we should keep looping
      // subtract the buy size USD from the available funds
      // if sizeType is BTC, then we need to convert
      if (sizeType == 'BTC') {
        let USDSize = size * buyPrice;
        availableFunds -= USDSize;
      } else {
        console.log('current funds', availableFunds);
        availableFunds -= size;
      }

      // increment the buy price
      // can have either percentage or dollar amount increment
      if (incrementType == 'dollars') {
        // if incrementing by dollar amount
        if (loopDirection == 'up') {
          buyPrice += increment;
        } else {
          buyPrice -= increment;
        }
      } else {
        // if incrementing by percentage
        if (loopDirection == 'up') {
          buyPrice = buyPrice * (1 + (increment / 100));
        } else {
          buyPrice = buyPrice / (1 + (increment / 100));
        }
      }


      // STOP TRADING IF...

      // stop if run out of funds unless user specifies to ignore that
      // console.log('ignore funds:', parameters.ignoreFunds);
      if (availableFunds < 0 && !parameters.ignoreFunds) {
        console.log('ran out of funds!', availableFunds);
        stop = true;
      }
      // console.log('available funds is', availableFunds);

      // stop if the buy price passes the ending value
      if (loopDirection == 'up' && buyPrice >= endingValue) {
        stop = true;
      } else if (loopDirection == 'down' && buyPrice <= endingValue) {
        stop = true;
      }
    }

    return {
      orderList: orderList,
      btcToBuy: btcToBuy,
    }
  }


  function submitAutoSetup(event) {
    event.preventDefault();
    setAutoTradeStarted(true);
    console.log('automatically setting up bot');
    autoTrader();
    setTimeout(() => {
      setAutoTradeStarted(false);
    }, 5000);
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
    let availableFunds = availableFundsUSD;
    // console.log('here is the current available funds', availableFunds);

    dispatch({
      type: 'AUTO_SETUP', payload: {
        availableFunds: availableFunds,
        tradingPrice: props.priceTicker,
        startingValue: startingValue,
        skipFirst: skipFirst,
        endingValue: endingValue,
        ignoreFunds: ignoreFunds,
        incrementType: incrementType,
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
      {JSON.stringify(props.store.accountReducer.userReducer)}
      {props.tips && <>
        <p>
          Enter the parameters you want and the bot will keep placing trades for you based on
          those parameters until you run out of cash, or until you have 10,000 trade-pairs.
          This is much easier than manually placing dozens of trades if they are following a basic pattern.
        </p>
        <p>
          Please be aware that the bot will slow down slightly with every 999 trades.
        </p>

        <div className="divider" />
      </>}
      <div className='auto-setup-form-and-results'>

        <form className='auto-setup-form left-border' onSubmit={submitAutoSetup}>

          {/* STARTING VALUE */}
          <p>What dollar amount to start at?</p>
          <label htmlFor='startingValue'>
            Starting Value:
            <br />
            <input
              name='startingValue'
              type='number'
              value={startingValue}
              // step={10}
              required
              onChange={(event) => setStartingValue(Number(event.target.value))}
            />
          </label>
          <br />

          {/* SKIP FIRST */}
          <input
            name="skip_first"
            type="checkbox"
            checked={skipFirst}
            onChange={handleSkipFirst}
          />
          <label htmlFor="skip_first">
            Skip first
          </label>

          {/* ENDING VALUE */}
          <p>What dollar amount to end at? (If not using all of your funds. Checking 'Ignore Funds'
            will allow the bot to keep adding trades regardless of how much cash you have until this
            limit is reached.)</p>
          <label htmlFor='startingValue'>
            Ending Value:
            <br />
            <input
              name='startingValue'
              type='number'
              value={endingValue}
              // step={10}
              required
              onChange={(event) => setEndingValue(Number(event.target.value))}
            />
          </label>

          <br />
          {/* IGNORE FUNDS */}
          <input
            name="ignore_funds"
            type="checkbox"
            checked={ignoreFunds}
            onChange={handleIgnoreFunds}
          />
          <label htmlFor="ignore_funds">
            Ignore Available Funds
          </label>

          {/* INCREMENT TYPE */}
          <p>Increment by:</p>

          <input
            type="radio"
            name="increment_type"
            value="dollars"
            checked={incrementType === "dollars"}
            onChange={handleIncrementType}
          />
          <label htmlFor='dollars'>
            Dollars
          </label>

          <input
            type="radio"
            name="increment_type"
            value="percentage"
            checked={incrementType === "percentage"}
            onChange={handleIncrementType}
          />
          <label htmlFor='percentage'>
            Percentage
          </label>


          {/* INCREMENT */}
          <p>What {incrementType === "dollars" ? "dollar amount" : "percentage"} to increment by?</p>
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
          {props.tips && <p>
            This calculation isn't perfect but it will get close. It can also change if the price of BTC moves up or down significantly while the
            trades are being set up.
          </p>}
          <p>
            Approximate number of trades to create:
          </p>
          <p>
            <strong>{numberWithCommas(totalTrades)}</strong>
          </p>
          {props.tips && <p>
            However, there is a total limit of 10,000 trades placed per user. Latency may cause it to
            create more, in which case you got lucky.
          </p>}

        </div>
      </div>

      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(AutoSetup);