import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from '../../../contexts/SocketProvider';
import { autoSetup } from '../../../shared';
import SingleTrade from '../../SingleTrade/SingleTrade';
import './AutoSetup.css'


function AutoSetup(props) {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const socket = useSocket();

  const [startingValue, setStartingValue] = useState(1000);
  const [skipFirst, setSkipFirst] = useState(false);
  const [endingValue, setEndingValue] = useState(100000);
  const [ignoreFunds, setIgnoreFunds] = useState(false);
  const [increment, setIncrement] = useState(100);
  const [incrementType, setIncrementType] = useState('dollars');
  const [base_size, setSize] = useState(10);
  const [sizeType, setSizeType] = useState('USD');
  const [transactionProduct, setTransactionProduct] = useState('BTC-USD');
  const [tradePairRatio, setTradePairRatio] = useState(1.1);
  const [setupResults, setSetupResults] = useState(1);
  const [autoTradeStarted, setAutoTradeStarted] = useState(false);
  const [totalTrades, setTotalTrades] = useState(false);

  const [orders, setOrders] = useState(<></>);
  const [btcToBuy, setBtcToBuy] = useState(0);
  const [availableFundsUSD, setAvailableFundsUSD] = useState(0);
  const [availableFundsBTC, setAvailableFundsBTC] = useState(0);


  function handleIncrementType(event) {
    setIncrementType(event.target.value)
  }

  function handleSizeType(event) {
    setSizeType(event.target.value)
    if (sizeType === "USD") {
      // setSizeType("BTC");
      setSize(0.001);
    } else {
      // setSizeType("USD");
      setSize(10);
    }
  }

  function changeSizeType(event) {
    event.preventDefault();
    if (sizeType === "USD") {
      // setSizeType("BTC");
      setSize(0.01);
    } else {
      // setSizeType("USD");
      setSize(10);
    }
  }

  function handleSkipFirst() {
    setSkipFirst(!skipFirst)
  }

  function handleIgnoreFunds() {
    setIgnoreFunds(!ignoreFunds)
  }

  const calculateResults = useCallback(
    () => {
      let payload = {
        availableFunds: availableFundsUSD,
        tradingPrice: socket.tickers.btc.price,
        // tradingPrice: 16000,
        startingValue: startingValue,
        skipFirst: skipFirst,
        endingValue: endingValue,
        ignoreFunds: ignoreFunds,
        incrementType: incrementType,
        increment: increment,
        trade_pair_ratio: tradePairRatio,
        base_size: base_size,
        sizeType: sizeType,
        product_id: transactionProduct,
      }

      let setup = autoSetup(user, payload);

      // this will be the buy price of the last trade pair
      setSetupResults(setup.orderList[setup.orderList.length - 1].original_buy_price);

      // this will be the total number of trades made
      setTotalTrades(setup.orderList.length);

      // this will be how much btc goes on the books
      setBtcToBuy(setup.btcToBuy)
      // setBtcToBuy(0)

      setOrders(setup.orderList.reverse().map((order) => {
        return <SingleTrade key={order.order_id} order={order} preview={true} />
      }))

      console.log(setup);

    }, [availableFundsUSD,
    socket.tickers.btc.price,
    startingValue,
    endingValue,
    ignoreFunds,
    incrementType,
    increment,
    tradePairRatio,
    base_size,
    sizeType,
    transactionProduct,
    skipFirst]
  )

  useEffect(() => {
    if (base_size) {
      calculateResults();
    }
  }, [startingValue, endingValue, increment, base_size, sizeType, calculateResults])

  useEffect(() => {
    if (user) {
      setAvailableFundsUSD(user.actualavailable_usd);
      setAvailableFundsBTC(user.actualavailable_btc);
    }
  }, [user]);

  // taken from https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
  const numberWithCommas = (x) => {
    // this will work in safari once lookbehind is supported
    // return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
    // for now, use this
    let parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
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

  function autoTrader() {
    let availableFunds = availableFundsUSD;
    // console.log('here is the current available funds', availableFunds);

    dispatch({
      type: 'AUTO_SETUP', payload: {
        availableFunds: availableFunds,
        tradingPrice: socket.tickers.btc.price,
        startingValue: startingValue,
        skipFirst: skipFirst,
        endingValue: endingValue,
        ignoreFunds: ignoreFunds,
        incrementType: incrementType,
        increment: increment,
        trade_pair_ratio: tradePairRatio,
        base_size: base_size,
        sizeType: sizeType,
        product_id: transactionProduct,
      }
    })
  }

  return (
    <div className="AutoSetup settings-panel scrollable">
      <div className="divider" />
      <h4>Auto Setup</h4>
      {props.tips && <>
        <p>
          Enter the parameters you want and the bot will keep placing trades for you based on
          those parameters until you run out of cash, or until you have 10,000 trade-pairs.
          This is much easier than manually placing dozens of trades if they are following a basic pattern.
        </p>
        <p>
          Please be aware that the bot may slow down slightly with extremely large numbers of trades.
        </p>

        {/* <div className="divider" /> */}
      </>}
      <div className='auto-setup-form-and-results'>

        <form className='auto-setup-form left-border' onSubmit={submitAutoSetup}>

          {/* STARTING VALUE */}
          {props.tips
            ? <p>What dollar amount to start at?</p>
            : <p />}
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
          {props.tips
            ? <p>What dollar amount to end at? (If not using all of your funds. Checking 'Ignore Funds'
              will allow the bot to keep adding trades regardless of how much cash you have until this
              limit is reached.)</p>
            : <p />}
          {/* <br /> */}
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
          {props.tips
            ? <p>What {incrementType === "dollars" ? "dollar amount" : "percentage"} to increment by?</p>
            : <p />}
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
          {props.tips
            ? <p>What is the trade-pair ratio (how much each BUY should increase in price before selling)?</p>
            : <p />}
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

          {/* SIZE */}
          <p>Size in:</p>

          <input
            type="radio"
            name="size_type"
            value="USD"
            checked={sizeType === "USD"}
            onChange={handleSizeType}
          />
          <label htmlFor='dollars'>
            USD
          </label>

          <input
            type="radio"
            name="size_type"
            value="BTC"
            checked={sizeType === "BTC"}
            onChange={handleSizeType}
          />
          <label htmlFor='BTC'>
            BTC
          </label>




          {props.tips
            ? <p>What size in {sizeType === "USD" ? "USD" : "BTC"} should each trade-pair be? </p>
            : <p />}


          <label htmlFor='size'>
            Size in {sizeType === "USD" ? "USD" : "BTC"}:
            <br />
            <input
              name='size'
              type='number'
              value={base_size}
              step={.01}
              required
              onChange={(event) => setSize(Number(event.target.value))}
            />
          </label>

          {/* SUBMIT */}
          <br />
          <br />
          {!autoTradeStarted
            ? <input className={`btn-store-api btn-blue medium ${user.theme}`} type="submit" name="submit" value="Start Setup" />
            : <p>Auto setup started!</p>
          }
        </form>

        <div className='auto-setup-results'>
          <h4>Result</h4>
          <p>
            The buy price of the last trade-pair will be close to:
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
          <p>
            BTC to reserve:
          </p>
          <p>
            <strong>{numberWithCommas(btcToBuy)}</strong>
          </p>


        </div>
      </div>
      <h4>Preview</h4>
      {orders}

      <div className="divider" />
    </div>
  );
}

export default AutoSetup;