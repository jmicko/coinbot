import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '../../../contexts/UserContext';
import { useSocket } from '../../../contexts/SocketProvider';
import { useProductDecimals } from '../../../hooks/useProductDecimals';
import { autoSetup, numberWithCommas } from '../../../shared';
import Graph from '../../Graph/Graph';
import SingleTrade from '../../SingleTrade/SingleTrade';
import './AutoSetup.css'
import { useData } from '../../../contexts/DataContext';


function AutoSetup(props) {
  const dispatch = useDispatch();
  const { user } = useUser();
  const { productID } = useData();

  const simulationReducer = useSelector((store) => store.accountReducer.simulationReducer);
  const socket = useSocket();

  const [startingValue, setStartingValue] = useState(1000);
  const [skipFirst, setSkipFirst] = useState(false);
  const [endingValue, setEndingValue] = useState(100000);
  const [ignoreFunds, setIgnoreFunds] = useState(false);
  const [increment, setIncrement] = useState(100);
  const [incrementType, setIncrementType] = useState('dollars');
  const [base_size, setSize] = useState(10);
  const [maxSize, setMaxSize] = useState(100);
  const [sizeType, setSizeType] = useState('quote');
  const [tradePairRatio, setTradePairRatio] = useState(1.1);
  const [setupResults, setSetupResults] = useState(1);
  const [cost, setCost] = useState(0);
  const [autoTradeStarted, setAutoTradeStarted] = useState(false);
  const [totalTrades, setTotalTrades] = useState(false);
  const [sizeCurve, setSizeCurve] = useState("linear");
  const [steepness, setSteepness] = useState(10);

  // constants that change based on product
  const baseID = user.availableFunds?.[productID]?.base_currency;
  const decimals = useProductDecimals(productID, user.availableFunds);

  const [simulation, setSimulation] = useState(true);
  // start date, default is one month ago
  const [simStartDate, setSimStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10));
  const [simReinvest, setSimReinvest] = useState(false);
  const [simReinvestPercent, setSimReinvestPercent] = useState(100);
  const [detailedResults, setDetailedResults] = useState(false);

  // setup results
  const [orders, setOrders] = useState(<></>);
  const [btcToBuy, setBtcToBuy] = useState(0);
  const [availableFundsUSD, setAvailableFundsUSD] = useState(0);
  const [availableFundsBase, setAvailableFundsBase] = useState(0);


  function handleSizeCurve(event) {
    console.log('event.target.value', event.target.value)
    setSizeCurve(event.target.value)
  }

  function handleSimReinvest() {
    setSimReinvest(!simReinvest)
  }

  function handleIncrementType(event) {
    setIncrementType(event.target.value)
    console.log('event.target.value', event.target.value)
    if (event.target.value === "dollars") {
      setIncrement(100);
    } else {
      setIncrement(0.5);
    }
  }

  function handleSizeType(event) {
    setSizeType(event.target.value)
    if (event.target.value === "quote") {
      setSize(10);
    } else {
      setSize(0.001);
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
        tradingPrice: socket.tickers[productID].price,
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
        product_id: productID,
        sizeCurve: sizeCurve,
        maxSize: maxSize,
        steepness: steepness,
        user: user,
      }

      let setup = autoSetup(user, payload);

      setCost(setup.cost)
      // this will be the buy price of the last trade pair
      // setSetupResults(setup.orderList[setup.orderList.length - 1]?.original_buy_price);
      setSetupResults(setup);

      // this will be the total number of trades made
      setTotalTrades(setup.orderList.length);

      // this will be how much btc goes on the books
      setBtcToBuy(setup.btcToBuy)
      // setBtcToBuy(0)

      // setup.orderList && 
      setOrders(setup.orderList.reverse().map((order, i) => {
        return <SingleTrade key={i} order={order} preview={true} product={productID} />
      }))
    }, [
    user,
    availableFundsUSD,
    socket.tickers,
    startingValue,
    endingValue,
    ignoreFunds,
    incrementType,
    increment,
    tradePairRatio,
    base_size,
    sizeType,
    productID,
    skipFirst,
    sizeCurve,
    maxSize,
    steepness,
  ])

  useEffect(() => {
    if (base_size !== null) {
      calculateResults();
    }
  }, [startingValue, endingValue, increment, base_size, sizeType, skipFirst, sizeCurve, maxSize, steepness, calculateResults])

  useEffect(() => {
    if (user?.availableFunds?.[productID]?.quote_available) {
      setAvailableFundsUSD(user.availableFunds?.[productID]?.quote_available);
      setAvailableFundsBase(user.availableFunds?.[productID]?.base_available);
    }
  }, [user.availableFunds, productID])

  // on component unmount, unset the simulation reducer
  useEffect(() => {
    return () => {
      dispatch({ type: 'UNSET_SIMULATION_RESULT' });
    }
  }, [dispatch]);



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
        simReinvest: simReinvest,
        simReinvestPercent: simReinvestPercent,
        startingValue: startingValue,
        skipFirst: skipFirst,
        endingValue: endingValue,
        ignoreFunds: ignoreFunds,
        incrementType: incrementType,
        increment: increment,
        trade_pair_ratio: tradePairRatio,
        base_size: base_size,
        sizeType: sizeType,
        product_id: productID,
        sizeCurve: sizeCurve,
        maxSize: maxSize,
        steepness: steepness,
      }
    })
  }

  function autoTrader() {
    let availableFunds = availableFundsUSD;
    // console.log('here is the current available funds', availableFunds);

    dispatch({
      type: 'AUTO_SETUP', payload: {
        availableFunds: availableFunds,
        tradingPrice: socket.tickers[productID].price,
        startingValue: startingValue,
        skipFirst: skipFirst,
        endingValue: endingValue,
        ignoreFunds: ignoreFunds,
        incrementType: incrementType,
        increment: increment,
        trade_pair_ratio: tradePairRatio,
        base_size: base_size,
        sizeType: sizeType,
        product_id: productID,
        sizeCurve: sizeCurve,
        maxSize: maxSize,
        steepness: steepness,
      }
    })
  }

  return (
    <div className="AutoSetup settings-panel scrollable">
      <div className="divider" />
      <h4>Auto Setup</h4>
      {/* {JSON.stringify(user.availableFunds?.[productID]?.quote_available)} */}
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

          <p>Current price: {socket.tickers[productID].price}</p>

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
            value="quote"
            checked={sizeType === "quote"}
            onChange={handleSizeType}
          />
          <label htmlFor='quote'>
            USD
          </label>

          <input
            type="radio"
            name="size_type"
            value="base"
            checked={sizeType === "base"}
            onChange={handleSizeType}
          />
          <label htmlFor='base'>
            {baseID}
          </label>

          {/* size curve radio buttons */}
          <p>Size Curve:</p>
          {props.tips && <p>
            "Flat line: same size for each trade-pair"
            <br />
            "Bell Curve: bigger size near current price"
          </p>}
          {/* {JSON.stringify(sizeCurve)} */}
          <label htmlFor="size_curve">
            <input
              type="radio"
              name="size_curve"
              value="linear"
              checked={sizeCurve === "linear"}
              onChange={handleSizeCurve}
            />
            Linear
          </label>

          <label htmlFor="size_curve">
            <input
              type="radio"
              name="size_curve"
              value="curve"
              checked={sizeCurve === "curve"}
              onChange={handleSizeCurve}
            />
            Curve
          </label>

          {props.tips
            ? <p>What size in {sizeType === "quote" ? "USD" : baseID} should each trade-pair be? </p>
            : <p />}


          <label htmlFor='size'>
            {sizeCurve === "curve" && "Min"} Size in {sizeType === "quote" ? "USD" : baseID}:
            <br />
            <input
              name='size'
              type='number'
              value={base_size}
              // step={.01}
              required
              onChange={(event) => setSize(Number(event.target.value))}
            />
          </label>

          {sizeCurve === "curve" && <br />}

          {sizeCurve === "curve" && <label htmlFor='size'>
            Max Size in {sizeType === "quote" ? "USD" : baseID}:
            <br />
            <input
              name='size'
              type='number'
              value={maxSize}
              // step={.01}
              required
              onChange={(event) => setMaxSize(Number(event.target.value))}
            />
          </label>}

          {sizeCurve === "curve" && <br />}

          {
            sizeCurve === "curve" && <label htmlFor='size'>
              Steepness:
              <br />
              <input
                name='size'
                type='number'
                value={steepness}
                required
                onChange={(event) => setSteepness(Number(event.target.value))}
              />
            </label>
          }


          {/* SUBMIT */}
          <br />
          <br />

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

          {/* SIM REINVEST */}
          {simulation && <div>
            <label htmlFor="simReinvest">
              <input
                name="simReinvest"
                type="checkbox"
                checked={simReinvest}
                onChange={handleSimReinvest}
              />
              Reinvest
            </label>
          </div>}

          <br />

          {simReinvest && <div>
            <label htmlFor='simReinvestPercent'>
              Reinvest Percent:
              <br />
              <input
                name='simReinvestPercent'
                type='number'
                value={simReinvestPercent}
                max={100}
                min={1}
                required
                onChange={(event) => setSimReinvestPercent(Number(event.target.value))}
              /> (1-100)
            </label>
          </div>
          }

          <br />

          {!simulation
            ? !autoTradeStarted
              ? <input className={`btn-store-api btn-blue medium ${user.theme}`} type="submit" name="submit" value="Start Setup" />
              : <p>Auto setup started!</p>
            /* button to run a simulation */
            : (simulationReducer.status === 'idle' || simulationReducer.status === 'complete') && !user.simulating && <button className={`btn-store-api btn-green medium ${user.theme}`} onClick={handleSimulation}>Run Simulation</button>
          }
          {/* if in node dev env */}
          {process.env.NODE_ENV === "development" && <button className={`btn-store-api btn-green medium ${user.theme}`} onClick={handleSimulation}>Force Simulation</button>}
          {/* {JSON.stringify(simulationReducer)} */}



          {/* {JSON.stringify(user.simulating)} */}
          {/* {JSON.stringify(simulationReducer)} */}
          {/* {user.simulating && <p>Simulating...</p>} */}




          {/* {simulationReducer.status === "running" ? <div> */}
          {user.simulating
            ? <div>
              <p>Simulation running...</p>
            </div>
            : simulationReducer.status === "complete" && <div>

              <p>Simulation complete!</p>
              {/* show optimum pair ratio */}
              <p>Optimum pair percent increase: {simulationReducer.result.bestPairRatio.pairRatio}
                {/* button to set the trade pair ratio to the optimum pair ratio */}
                &nbsp;<button className={`btn-store-api btn-green medium ${user.theme}`} onClick={
                  (event) => {
                    event.preventDefault();
                    setTradePairRatio(simulationReducer?.result?.bestPairRatio?.pairRatio);
                  }
                }>Use It!</button>
              </p>
              <p>This would have resulted in about ${simulationReducer.result.bestPairRatio.profit?.toFixed(2)} in profit over the specified duration.
                Please note this is a rough estimate based on available historical data</p>
              {/* show optimum increment */}
              {/* <p>Optimum increment: {simulationReducer.bestIncrement}</p> */}





              <h4>Simulation Results</h4>
              <p>Best pair ratio: {simulationReducer?.result?.bestPairRatio?.pairRatio}</p>
              {/* button to to detailed results */}
              <button className={`btn-store-api btn-green medium ${user.theme}`} onClick={() => setDetailedResults(!detailedResults)}>Detailed Results</button>
              {detailedResults && <div>
                {/* list of simResults array from the reducer */}
                <ul>
                  {simulationReducer?.result?.simResults?.map((result, index) => {
                    return (
                      <li key={index}>
                        <p>Pair Ratio: {result.pairRatio} Profit: {result.profit}</p>
                      </li>
                    )
                  })}
                </ul>
              </div>
              }
            </div>
          }
        </form>

        {setupResults?.valid
          ? <div className='auto-setup-results'>
            <h4>Result</h4>
            <p>
              The buy price of the last trade-pair will be close to:
              <br />
              <strong>{numberWithCommas(setupResults.lastBuyPrice?.toFixed(2) || 0)}</strong>
            </p>
            {props.tips && <p>
              This calculation isn't perfect but it will get close. It can also change if the price of {baseID} moves up or down significantly while the
              trades are being set up.
            </p>}
            <p>
              Approximate number of trades to create:
              <br />
              Total: <strong>{numberWithCommas(totalTrades)}</strong>&nbsp;
              Buys: <strong>{numberWithCommas(setupResults?.buyCount)}</strong>&nbsp;
              Sells: <strong>{numberWithCommas(setupResults?.sellCount)}</strong>
            </p>
            {props.tips && <p>
              However, there is a total limit of 10,000 trades placed per user. Latency may cause it to
              create more, in which case you got lucky.
            </p>}
            {ignoreFunds
              ? <>
                <p>
                  Total USD cost at current price:
                  <br />
                  <strong>${numberWithCommas(((cost) > 0 ? cost : 0).toFixed(2))}</strong>
                </p>
                <p>
                  USD to reserve:
                  <br />
                  <strong> {setupResults?.quoteToReserve.toFixed(decimals.quoteIncrement)}</strong>
                </p>
                <p>
                  {baseID} to reserve:
                  <br />
                  <strong>{numberWithCommas(btcToBuy)}</strong>
                </p>
                <p>
                  {baseID} you have:
                  <br />
                  <strong>{numberWithCommas(Number(availableFundsBase).toFixed(decimals.baseIncrement))}</strong>
                </p>
                <p>
                  {baseID} you need to buy manually:
                  <br />
                  <strong>{numberWithCommas(((btcToBuy - availableFundsBase) > 0 ? btcToBuy - availableFundsBase : 0).toFixed(decimals.baseIncrement))}</strong>
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
          : <div className='auto-setup-results'>
            <h4>Result</h4>
            <p>
              Please enter valid values to see the result.
            </p>
          </div>}
      </div>
      {/* {JSON.stringify(orders[0])} */}
      {/* {console.log(decimals, 'decimals!!!!!!!!!!!!!!!')} */}
      {(orders.length > 0) && sizeCurve !== 'linear' && setupResults.valid && <Graph data={orders} product={decimals} setupResults={setupResults} />}
      <h4>Preview</h4>
      {orders}

      <div className="divider" />
    </div>
  );
}

export default AutoSetup;

// ctx.strokeStyle = 'black';
// ctx.lineWidth = 1;

// ctx.beginPath();
// ctx.moveTo((data[0].original_buy_price - minPrice) * xScale, canvas.height - (data[0].buy_quote_size - minSize) * yScale);
// for (let i = 1; i < data.length; i++) {
//   const x = (data[i].original_buy_price - minPrice) * xScale;
//   const y = canvas.height - (data[i].buy_quote_size - minSize) * yScale;

//   ctx.lineTo(x, y);
// }
// ctx.stroke();
