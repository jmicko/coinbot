import React, {
  useState,
  useEffect,
  // useCallback,
  useRef,
  useCallback,
  useMemo
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useUser } from '../../../contexts/UserContext';
import { useSocket } from '../../../contexts/SocketProvider';
import { useProductDecimals } from '../../../hooks/useProductDecimals';
import { autoSetup, numberWithCommas } from '../../../shared';
import Graph from '../../Graph/Graph';
import SingleTrade from '../../SingleTrade/SingleTrade';
import './AutoSetup.css'
import { useData } from '../../../contexts/DataContext';
import { useFetchData } from '../../../hooks/fetchData';
import DebouncedInput from '../../DebouncedInput.js/DebouncedInput';


function AutoSetup(props) {
  const dispatch = useDispatch();
  const { user } = useUser();
  const { productID, currentProduct } = useData();

  // debounced input component


  const { createData: startAutoSetup } = useFetchData('/api/trade/autoSetup', { noLoad: true });

  const simulationReducer = useSelector((store) => store.accountReducer.simulationReducer);
  const { currentPrice } = useSocket();

  // console.log('currentPrice', (currentPrice / 2).toFixed(currentProduct.quote_increment_decimals));

  const [auto, setAuto] = useState({
    // startingValue: 1000,
    startingValue: Number((currentPrice / 2).toFixed(currentProduct.price_rounding - 2 > 0 ? currentProduct.price_rounding - 2 : 0)),
    skipFirst: false,
    endingValue: Number((currentPrice * 1.5).toFixed(currentProduct.price_rounding - 2 > 0 ? currentProduct.price_rounding - 2 : 0)),
    ignoreFunds: false,
    increment: 100,
    incrementType: 'dollars',
    size: 10,
    maxSize: 100,
    sizeType: 'quote',
    trade_pair_ratio: 1.1,
    sizeCurve: 'linear',
    steepness: 10,
    tradePairRatio: 5
  });

  const [setupResults, setSetupResults] = useState({
    valid: false,
    orderList: [],
    cost: 0,
    lastBuyPrice: 0,
    btcToBuy: 0,
    options: {},
    quoteToReserve: 0,
    buyCount: 0,
    sellCount: 0,
  });

  const [autoTradeStarted, setAutoTradeStarted] = useState(false);
  // const [sizeCurve, setSizeCurve] = useState("linear");
  // store a time stamp of when the last input was changed
  // this will be used to determine if the autoSetup function should be called
  // it should only be called if the last input change was more than 1 second ago
  // this will make the inputs more responsive
  const [lastInputChange, setLastInputChange] = useState(Date.now());
  // input values are all stored in the auto object
  // make a useEffect that will watch the auto object for changes and update the lastInputChange

  useEffect(() => {
    // console.log('auto object CHANGED!!!!!!!!!!!');
    setLastInputChange(Date.now());
  }, [auto]);


  // constants that change based on product
  const baseID = user.availableFunds?.[productID]?.base_currency;
  const decimals = useProductDecimals(productID, user.availableFunds);

  const [simulation, setSimulation] = useState(true);
  // start date, default is one month ago
  const [simStartDate, setSimStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10));
  const [simReinvest, setSimReinvest] = useState(false);
  const [simReinvestPercent, setSimReinvestPercent] = useState(100);
  const [detailedResults, setDetailedResults] = useState(false);

  // const [btcToBuy, setBtcToBuy] = useState(0);
  // const [availableFundsUSD, setAvailableFundsUSD] = useState(0);
  const availableQuote = user.availableFunds?.[productID]?.quote_available;
  // const [availableFundsBase, setAvailableFundsBase] = useState(0);
  const availableBase = user.availableFunds?.[productID]?.base_available;

  // update the ref when the values change
  // turn loading into a ref so it doesn't cause the useEffect to run when it changes, since the useEffect is what changes it
  const loadingRef = useRef();
  useEffect(() => {
    loadingRef.current = false;
  }, [])


  // useEffect(() => {
  //   // console.log('running autoSetup useEffect', loadingRef.current)
  //   // if any of the dependencies are undefined, don't run the autoSetup function
  //   if (!user || !availableQuote || !currentPrice || !currentProduct) return;

  //   // check if the last input change was more than 1 second ago
  //   // if it wasn't, don't run the autoSetup function
  //   if (loadingRef.current || (Date.now() - lastInputChange < 2000)) return;

  //   loadingRef.current = true;

  //   // console.log(loadingRef.current, 'running autoSetup')
  //   const results = autoSetup(user, {
  //     ...auto,
  //     availableQuote: availableQuote,
  //     tradingPrice: currentPrice,
  //     product: currentProduct,
  //     user: user,
  //   });
  //   setSetupResults(results);
  //   // console.log('setting loading to false')
  //   loadingRef.current = false;

  // }, [
  //   lastInputChange,
  //   user,
  //   availableQuote,
  //   currentPrice,
  //   currentProduct,
  //   auto,
  // ])

  // can we maybe rewrite the above useEffect using useCallback and useMemo?
  // first create a memoized result of the autoSetup function as imported from the autoSetup.js file
  const memoizedAutoSetup = useCallback(autoSetup, []);
  // then create a memoized result of the autoSetup function with the user, availableQuote, currentPrice, currentProduct, and auto objects as dependencies
  const memoizedAutoSetupWithDependencies = useMemo(() => memoizedAutoSetup(user, {
    ...auto,
    availableQuote: availableQuote,
    tradingPrice: currentPrice,
    product: currentProduct,
    user: user,
  }), [user, availableQuote, currentPrice, currentProduct, auto])
  // then create a useEffect that will run the memoizedAutoSetupWithDependencies function
  useEffect(() => {
    // console.log('running autoSetup useEffect', loadingRef.current)
    if (!user || !availableQuote || !currentPrice || !currentProduct) return;
    if (loadingRef.current || (Date.now() - lastInputChange < 2000)) return;
    loadingRef.current = true;
    // console.log(loadingRef.current, 'running autoSetup')
    const results = memoizedAutoSetupWithDependencies;
    setSetupResults(results);
    // console.log('setting loading to false')
    loadingRef.current = false;
  }, [memoizedAutoSetupWithDependencies, lastInputChange])









  // figure out which dependency keeps changing and causing the above to run
  useEffect(() => {
    console.log('user changed11111')
  }, [user])
  useEffect(() => {
    console.log('availableQuote changed22222')
  }, [availableQuote])
  // useEffect(() => {
  //   console.log('currentPrice changed33333')
  // }, [currentPrice])
  useEffect(() => {
    console.log('currentProduct changed44444')
  }, [currentProduct])
  useEffect(() => {
    console.log('auto changed55555')
  }, [auto])


  // const setupResults = setupResultsRef.current;
  // console.log('setupResults', setupResults)


  function handleSizeCurve(event) {
    console.log('event.target.value', event.target.value)
    // setSizeCurve(event.target.value)
    setAuto({
      ...auto,
      sizeCurve: event.target.value
    })
  }

  function handleSimReinvest() {
    setSimReinvest(!simReinvest)
  }

  function handleIncrementType(event) {
    // set the type of increment, dollars or percent
    setAuto({
      ...auto,
      incrementType: event.target.value,
      increment: (event.target.value === "dollars" ? 10 : 0.5)
    });
  }

  function handleSizeType(event) {
    const sizeType = event.target.value;
    setAuto({
      ...auto,
      sizeType: sizeType,
      size: (sizeType === "quote" ? 10 : 0.001)
    })
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
      type: 'SIMULATE_TRADES', payload: {
        ...auto,
        simStartDate: simStartDate,
        availableFunds: availableQuote,
        simReinvest: simReinvest,
        simReinvestPercent: simReinvestPercent,
        tradingPrice: currentPrice,
      }
    })
  }

  function autoTrader() {
    let availableFunds = availableQuote;
    // console.log('here is the current available funds', availableFunds);
    startAutoSetup({
      ...auto,
      availableFunds: availableFunds,
      tradingPrice: currentPrice,


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

          <p>Current price: {currentPrice}</p>

          {/* STARTING VALUE */}
          {props.tips
            ? <p>What dollar amount to start at?</p>
            : <p />}
          <label htmlFor='startingValue'>
            Starting Value: <span>{auto.startingValue}</span>
            <br />
            {/* <input
              name='startingValue'
              type='number'
              value={auto.startingValue}
              required
              onChange={(event) => setAuto({ ...auto, startingValue: Number(event.target.value) })}
            /> */}
            <DebouncedInput
              onChange={(n) => setAuto({ ...auto, startingValue: Number(n) || 133 })}
              initValue={auto.startingValue}
              type='number'
              name='startingValue'
            />
          </label>
          {(auto.startingValue === 0 && !auto.skipFirst) && <p className='red'>Starting value cannot be zero unless you skip first!</p>}
          {(auto.startingValue < 0 && !auto.skipFirst) && <p className='red'>Starting value cannot be negative!</p>}
          <br />

          {/* SKIP FIRST */}
          <input
            name="skip_first"
            type="checkbox"
            checked={auto.skipFirst}
            onChange={(event) => setAuto({ ...auto, skipFirst: event.target.checked })}
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
            Ending Value: <span>{auto.endingValue}</span>
            <br />
            {/* <input
              name='startingValue'
              type='number'
              value={auto.endingValue}
              // step={10}
              required
              onChange={(event) => setAuto({ ...auto, endingValue: Number(event.target.value) })}
            /> */}
            <DebouncedInput
              onChange={(n) => setAuto({ ...auto, endingValue: Number(n) || 133 })}
              initValue={auto.endingValue}
              type='number'
              name='endingValue'
            />
          </label>

          <br />
          {/* IGNORE FUNDS */}
          <input
            name="ignore_funds"
            type="checkbox"
            checked={auto.ignoreFunds}
            onChange={(event) => setAuto({ ...auto, ignoreFunds: event.target.checked })}
          />
          <label htmlFor="ignore_funds">
            Ignore Available Funds
          </label>

          {/* INCREMENT TYPE */}
          <p>Increment by:</p>

          <label htmlFor='dollars'>
            <input
              type="radio"
              name="increment_type"
              value="dollars"
              checked={auto.incrementType === "dollars"}
              onChange={handleIncrementType}
            />
            Dollars
          </label>

          <label htmlFor='percentage'>
            <input
              type="radio"
              name="increment_type"
              value="percentage"
              checked={auto.incrementType === "percentage"}
              onChange={handleIncrementType}
            />
            Percentage
          </label>


          {/* INCREMENT */}
          {props.tips
            ? <p>What {auto.incrementType === "dollars" ? "dollar amount" : "percentage"} to increment by?</p>
            : <p />}
          <label htmlFor='increment'>
            Increment: <span>{auto.increment}</span>
            <br />
            {/* <input
              name='increment'
              type='number'
              value={auto.increment}
              required
              onChange={(event) => setAuto({ ...auto, increment: Number(event.target.value) })}
            /> */}
            <DebouncedInput
              onChange={(n) => setAuto({ ...auto, increment: Number(n) || 133 })}
              initValue={auto.increment}
              type='number'
              name='increment'
            />
          </label>

          {/* RATIO */}
          {props.tips
            ? <p>What is the trade-pair percent increase (how much each BUY should increase in price before selling)?</p>
            : <p />}
          <label htmlFor='ratio'>
            Trade-pair percent increase: <span>{auto.tradePairRatio}</span>
            <br />
            {/* <input
              name='ratio'
              type='number'
              value={auto.tradePairRatio}
              required
              onChange={(event) => setAuto({ ...auto, tradePairRatio: Number(event.target.value) })}
            /> */}
            <DebouncedInput
              onChange={(n) => setAuto({ ...auto, tradePairRatio: Number(n) || 133 })}
              initValue={auto.tradePairRatio}
              type='number'
              name='ratio'
            />
          </label>

          {/* SIZE */}

          {/* SIZE */}
          <p>Size in:</p>

          <input
            type="radio"
            name="size_type"
            value="quote"
            checked={auto.sizeType === "quote"}
            onChange={handleSizeType}
          />
          <label htmlFor='quote'>
            USD
          </label>

          <input
            type="radio"
            name="size_type"
            value="base"
            checked={auto.sizeType === "base"}
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
              checked={auto.sizeCurve === "linear"}
              onChange={(e) => setAuto({ ...auto, sizeCurve: e.target.value })}
            />
            Linear
          </label>

          <label htmlFor="size_curve">
            <input
              type="radio"
              name="size_curve"
              value="curve"
              checked={auto.sizeCurve === "curve"}
              onChange={(e) => setAuto({ ...auto, sizeCurve: e.target.value })}
            />
            Curve
          </label>

          {props.tips
            ? <p>What size in {auto.sizeType === "quote" ? "USD" : baseID} should each trade-pair be? </p>
            : <p />}


          <label htmlFor='size'>
            {auto.sizeCurve === "curve" && "Min"} Size in {
              auto.sizeType === "quote"
                ? "USD"
                : baseID
            }: <span>{auto.size}</span>
            <br />
            {/* <input
              name='size'
              type='number'
              value={auto.size}
              // step={.01}
              required
              onChange={(event) => setAuto({ ...auto, size: Number(event.target.value) })}
            /> */}
            <DebouncedInput
              onChange={(n) => setAuto({ ...auto, size: Number(n) || 133 })}
              initValue={auto.size}
              type='number'
              name='size'
            />
          </label>

          {auto.sizeCurve === "curve" && <br />}

          {auto.sizeCurve === "curve" && <label htmlFor='size'>
            Max Size in {auto.sizeType === "quote" ? "USD" : baseID}: <span>{auto.maxSize}</span>
            <br />
            {/* <input
              name='size'
              type='number'
              value={auto.maxSize}
              // step={.01}
              required
              onChange={(event) => setAuto({ ...auto, maxSize: Number(event.target.value) })}
            /> */}
            <DebouncedInput
              onChange={(n) => setAuto({ ...auto, maxSize: Number(n) || 133 })}
              initValue={auto.maxSize}
              type='number'
              name='size'
            />
          </label>}

          {auto.sizeCurve === "curve" && <br />}

          {
            auto.sizeCurve === "curve" && <label htmlFor='size'>
              Steepness: <span>{auto.steepness}</span>
              <br />
              {/* <input
                name='size'
                type='number'
                value={auto.steepness}
                required
                onChange={(event) => setAuto({ ...auto, steepness: Number(event.target.value) })}
              /> */}
              <DebouncedInput
                onChange={(n) => setAuto({ ...auto, steepness: Number(n) || 133 })}
                initValue={auto.steepness}
                type='number'
                name='size'
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
                onChange={() => setSimReinvest(!simReinvest)}
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
                    setAuto({ ...auto, tradePairRatio: simulationReducer?.result?.bestPairRatio?.pairRatio });
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

        {setupResults.valid
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
              Total: <strong>{numberWithCommas(setupResults.orderList.length)}</strong>&nbsp;
              Buys: <strong>{numberWithCommas(setupResults?.buyCount)}</strong>&nbsp;
              Sells: <strong>{numberWithCommas(setupResults?.sellCount)}</strong>
            </p>
            {props.tips && <p>
              However, there is a total limit of 10,000 trades placed per user. Latency may cause it to
              create more, in which case you got lucky.
            </p>}
            {auto.ignoreFunds
              ? <>
                <p>
                  Total USD cost at current price:
                  <br />
                  <strong>${numberWithCommas(((setupResults.cost) > 0 ? setupResults.cost : 0).toFixed(2))}</strong>
                </p>
                <p>
                  USD to reserve:
                  <br />
                  <strong> {setupResults?.quoteToReserve.toFixed(decimals.quoteIncrement)}</strong>
                </p>
                <p>
                  {baseID} to reserve:
                  <br />
                  <strong>{numberWithCommas(setupResults.btcToBuy)}</strong>
                </p>
                <p>
                  {baseID} you have:
                  <br />
                  <strong>{numberWithCommas(Number(availableBase).toFixed(decimals.baseIncrement))}</strong>
                </p>
                <p>
                  {baseID} you need to buy manually:
                  <br />
                  <strong>{numberWithCommas(((setupResults.btcToBuy - availableBase) > 0 ? setupResults.btcToBuy - availableBase : 0).toFixed(decimals.baseIncrement))}</strong>
                </p>
              </>
              : <>
                <p>
                  It will cost you:
                  <br />
                  <strong>${numberWithCommas(((setupResults.cost) > 0 ? setupResults.cost : 0).toFixed(2))}</strong>
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
      {(setupResults.valid
        && setupResults.orderList.length > 0)
        // && auto.sizeCurve !== 'linear'
        && <Graph data={setupResults.orderList} product={decimals} setupResults={setupResults} />}
      <h4>Preview</h4>
      {setupResults.valid
        && setupResults?.orderList?.length > 0
        && structuredClone(setupResults.orderList).reverse().map((order, i) => {
          return <SingleTrade key={i} order={order} preview={true} product={decimals} />
        })}

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
