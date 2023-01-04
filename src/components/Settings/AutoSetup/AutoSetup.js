import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from '../../../contexts/SocketProvider';
import { autoSetup } from '../../../shared';
import SingleTrade from '../../SingleTrade/SingleTrade';
import './AutoSetup.css'


function AutoSetup(props) {
  const dispatch = useDispatch();
  const user = useSelector((store) => store.accountReducer.userReducer);
  const simulationReducer = useSelector((store) => store.accountReducer.simulationReducer);
  const socket = useSocket();

  const [startingValue, setStartingValue] = useState(1000);
  const [skipFirst, setSkipFirst] = useState(false);
  const [endingValue, setEndingValue] = useState(100000);
  const [ignoreFunds, setIgnoreFunds] = useState(false);
  const [increment, setIncrement] = useState(100);
  const [incrementType, setIncrementType] = useState('dollars');
  const [base_size, setSize] = useState(10);
  const [sizeType, setSizeType] = useState('USD');
  const [tradePairRatio, setTradePairRatio] = useState(1.1);
  const [setupResults, setSetupResults] = useState(1);
  const [cost, setCost] = useState(0);
  const [autoTradeStarted, setAutoTradeStarted] = useState(false);
  const [totalTrades, setTotalTrades] = useState(false);

  const [simulation, setSimulation] = useState(true);
  // start date, default is one month ago
  const [simStartDate, setSimStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10));

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
        tradingPrice: socket.tickers[props.product].price,
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
        product_id: props.product,
      }

      let setup = autoSetup(user, payload);

      setCost(setup.cost)
      // this will be the buy price of the last trade pair
      setSetupResults(setup.orderList[setup.orderList.length - 1]?.original_buy_price);

      // this will be the total number of trades made
      setTotalTrades(setup.orderList.length);

      // this will be how much btc goes on the books
      setBtcToBuy(setup.btcToBuy)
      // setBtcToBuy(0)

      // setup.orderList && 
      setOrders(setup.orderList.reverse().map((order, i) => {
        return <SingleTrade key={i} order={order} preview={true} />
      }))
    }, [
    user,
    availableFundsUSD,
    socket.tickers[props.product].price,
    startingValue,
    endingValue,
    ignoreFunds,
    incrementType,
    increment,
    tradePairRatio,
    base_size,
    sizeType,
    props.product,
    skipFirst
  ])

  useEffect(() => {
    if (base_size !== null) {
      calculateResults();
    }
  }, [startingValue, endingValue, increment, base_size, sizeType, skipFirst, calculateResults])

  useEffect(() => {
    if (user) {
      setAvailableFundsUSD(user.availableFunds?.[props.product]?.quote_available);
      setAvailableFundsBTC(user.availableFunds?.[props.product]?.base_available);
    }
  }, [user]);

  // on component unmount, unset the simulation reducer
  useEffect(() => {
    return () => {
      dispatch({ type: 'UNSET_SIMULATION_RESULT' });
    }
  }, [dispatch]);


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

  function handleSimulation(event) {
    event.preventDefault();
    console.log('simulating trades');
    dispatch({
      type: 'SIMULATE_TRADES',

      payload: {
        simStartDate: simStartDate,
        availableFunds: availableFundsUSD,
        // tradingPrice: socket.tickers[props.product].price,
        startingValue: startingValue,
        skipFirst: skipFirst,
        endingValue: endingValue,
        ignoreFunds: ignoreFunds,
        incrementType: incrementType,
        increment: increment,
        trade_pair_ratio: tradePairRatio,
        base_size: base_size,
        sizeType: sizeType,
        product_id: props.product,
      }
    })
  }

  function autoTrader() {
    let availableFunds = availableFundsUSD;
    // console.log('here is the current available funds', availableFunds);

    dispatch({
      type: 'AUTO_SETUP', payload: {
        availableFunds: availableFunds,
        tradingPrice: socket.tickers[props.product].price,
        startingValue: startingValue,
        skipFirst: skipFirst,
        endingValue: endingValue,
        ignoreFunds: ignoreFunds,
        incrementType: incrementType,
        increment: increment,
        trade_pair_ratio: tradePairRatio,
        base_size: base_size,
        sizeType: sizeType,
        product_id: props.product,
      }
    })
  }

  return (
    <div className="AutoSetup settings-panel scrollable">
      <div className="divider" />
      <h4>Auto Setup</h4>
      {JSON.stringify(user.availableFunds?.[props.product]?.quote_available)}
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
          
          {/* radio buttons to pick live or simulation */}
          <div className="radio-buttons">
            <label htmlFor="live">
              <input
                type="radio"
                name="liveOrSim"
                id="live"
                value="live"
                checked={simulation === false}
                onChange={() => setSimulation(false)}
              />
              Live
            </label>
            <label htmlFor="simulation">
              <input
                type="radio"
                name="liveOrSim"
                id="simulation"
                value="simulation"
                checked={simulation === true}
                onChange={() => setSimulation(true)}
              />
              Simulation
            </label>
          </div>

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
          {(startingValue === 0 && !skipFirst) && <p className='red'>Starting value cannot be zero unless you skip first!</p>}
          {(startingValue < 0 && !skipFirst) && <p className='red'>Starting value cannot be negative!</p>}
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
            ? <p>What is the trade-pair percent increase (how much each BUY should increase in price before selling)?</p>
            : <p />}
          <label htmlFor='ratio'>
            Trade-pair percent increase:
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
          {/* starting date picker that will only show if simulation is true */}
          {simulation && <div>
            <label htmlFor='simStartDate'>
              Start Date:
              <br />
              <input
                name='simStartDate'
                type='date'
                value={simStartDate}
                required
                onChange={(event) => setSimStartDate(event.target.value)}
              />
            </label>
            <br />
            <br />
          </div>}


          {!simulation
            ? !autoTradeStarted
              ? <input className={`btn-store-api btn-blue medium ${user.theme}`} type="submit" name="submit" value="Start Setup" />
              : <p>Auto setup started!</p>
            /* button to run a simulation */
            : (simulationReducer.status === 'idle' || simulationReducer.status === 'complete') && <button className={`btn-store-api btn-green medium ${user.theme}`} onClick={handleSimulation}>Run Simulation</button>
          }
          {/* {JSON.stringify(simulationReducer)} */}
          {simulationReducer.status === "running" ? <div>
            {/*  */}
            <p>Simulation running...</p>
          </div>
            : simulationReducer.status === "complete" && <div>
              <p>Simulation complete!</p>
              {/* show optimum pair ratio */}
              <p>Optimum pair percent increase: {simulationReducer.result.bestPairRatio.pairRatio}
                {/* button to set the trade pair ratio to the optimum pair ratio */}
                &nbsp;<button className={`btn-store-api btn-green medium ${user.theme}`} onClick={(event) => { event.preventDefault(); setTradePairRatio(simulationReducer.result.bestPairRatio.pairRatio) }}>Use It!</button>
              </p>
              <p>This would have resulted in about ${simulationReducer.result.bestPairRatio.profit.toFixed(2)} in profit over the specified duration.
                Please note this is a rough estimate based on available historical data</p>
              {/* show optimum increment */}
              {/* <p>Optimum increment: {simulationReducer.bestIncrement}</p> */}
            </div>
          }
        </form>

        <div className='auto-setup-results'>
          <h4>Result</h4>
          <p>
            The buy price of the last trade-pair will be close to:
            <br />
            <strong>{numberWithCommas(setupResults?.toFixed(2) || 0)}</strong>
          </p>
          {props.tips && <p>
            This calculation isn't perfect but it will get close. It can also change if the price of BTC moves up or down significantly while the
            trades are being set up.
          </p>}
          <p>
            Approximate number of trades to create:
            <br />
            <strong>{numberWithCommas(totalTrades)}</strong>
          </p>
          {props.tips && <p>
            However, there is a total limit of 10,000 trades placed per user. Latency may cause it to
            create more, in which case you got lucky.
          </p>}
          {ignoreFunds
            ? <>
              <p>
                USD to reserve:
                <br />
                <strong>${numberWithCommas(((cost) > 0 ? cost : 0).toFixed(2))}</strong>
              </p>
              <p>
                BTC to reserve:
                <br />
                <strong>{numberWithCommas(btcToBuy)}</strong>
              </p>
              <p>
                BTC you have:
                <br />
                <strong>{numberWithCommas(Number(availableFundsBTC))}</strong>
              </p>
              <p>
                BTC you need to buy manually:
                <br />
                <strong>{numberWithCommas(((btcToBuy - availableFundsBTC) > 0 ? btcToBuy - availableFundsBTC : 0).toFixed(8))}</strong>
              </p>
            </>
            : <>
              <p>
                It will cost you:
                <br />
                <strong>${numberWithCommas(((cost) > 0 ? cost : 0).toFixed(2))}</strong>
              </p>
            </>
          }


        </div>
      </div>
      <h4>Preview</h4>
      {orders}

      <div className="divider" />
    </div>
  );
}

export default AutoSetup;