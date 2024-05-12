import { CaratWaveLoader, DotLoader } from "../../Loading";
import { useData } from '../../../hooks/useData.js';
import { useEffect, useState } from "react";
import FormItem from "./FormItem.js";
import Graph from '../../Graph/Graph';
import './AutoSetup.css';
import { useUser } from '../../../hooks/useUser.js';
import useAutoSetup from "./useAutoSetup.js";
import { devLog, no, numberWithCommas } from "../../../shared.js";
import SingleTrade from "../../SingleTrade/SingleTrade.js";
import usePostFetch from "../../../hooks/usePostFetch.js";
import Confirm from "../../Confirm/Confirm.js";
import { useWebSocket } from "../../../hooks/useWebsocket.js";

function AutoSetup(props: { tips: boolean }) {
  const { productID, baseID, quoteID, pqd, pbd, refreshOrders } = useData();
  const { currentPrice: currentPriceString } = useWebSocket();
  const currentPriceTicker = Number(currentPriceString);
  // const currentPriceTicker = tickers[productID]?.price;
  const { user, theme } = useUser();

  const [currentPrice, setCurrentPrice] = useState(currentPriceTicker);

  const availableQuote = user.availableFunds?.[productID]?.quote_available;
  const availableBase = user.availableFunds?.[productID]?.base_available;
  const availableBaseValue = Number((availableBase * currentPrice).toFixed(pqd));

  const { result: setupResults, options, setOptions, calculating, recentInput } = useAutoSetup(user, currentPrice, pqd);
  const [showPreview, setShowPreview] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [confirmingAuto, setConfirmingAuto] = useState(false);
  const [autoTradeStarted, setAutoTradeStarted] = useState(false);

  const { postData: startAutoSetup } = usePostFetch({
    url: `/api/orders/autoSetup`,
    from: 'startAutoSetup in AutoSetup',
    refreshCallback: refreshOrders,
  })

  const baseNeeded = setupResults ? Number((setupResults.btcToBuy - availableBase) > 0 ? setupResults.btcToBuy - availableBase : 0) : 0;
  const quoteNeeded = setupResults ? Number((setupResults.quoteToReserve - availableQuote) > 0 ? setupResults.quoteToReserve - availableQuote : 0) : 0;

  const quoteNeededForBaseNeeded = setupResults ? Number((baseNeeded * currentPrice) > 0 ? baseNeeded * currentPrice : 0) : 0;

  useEffect(() => {
    // if the price ticker is more than x% different than the current price, 
    // update the current price.
    // this will prevent too many re-renders trying to calculate the results
    // when the number and side of trades is not likely to change significantly
    const priceDifference = currentPriceTicker - currentPrice;
    const percentDifference = priceDifference / currentPrice;
    const absolutePercentDifference = Math.abs(percentDifference);
    // console.log(absolutePercentDifference, 'percentDifference');

    if (absolutePercentDifference > 0.001) {
      setCurrentPrice(currentPriceTicker);
    }
  }, [currentPriceTicker, currentPrice])

  if (!currentPriceTicker) return (
    <div className="AutoSetup settings-panel scrollable">
      <p>Waiting for price data<DotLoader /></p>
    </div>
  )

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = event.target;
    // console.log(`changing ${name} which is type:${type} to ${Boolean(value)} (${!value})`, Boolean(value));

    setOptions(prevState => ({
      ...prevState,
      [name]:
        type === 'checkbox'
          ? !prevState[name]
          : type === 'number'
            ? Number(value)
            : value
    }));
  };

  function submitAutoSetup() {
    setAutoTradeStarted(true);
    devLog('automatically setting up bot');
    startAutoSetup(setupResults);
    setTimeout(() => {
      setAutoTradeStarted(false);

    }, 5000);
  }

  const tips = {
    startingValue: 'What dollar amount to start at?',
    endingValue: `What dollar amount to end at? (If not using all of your funds. \
    Checking 'Ignore Funds' will allow the bot to keep adding trades regardless of how \
    much cash you have until this limit is reached.)`,
    increment: `What ${options.incrementType === "dollars" ? "dollar amount" : "percentage"} \
  to increment by?`,
    ratio: `What is the trade-pair percent increase \
  (how much each BUY should increase in price before selling)?`,
    sizeCurve: `Flat line: same size for each trade-pair
  Bell Curve: bigger size near current price`,
    size: `What size in ${options.sizeType === "quote" ? quoteID : baseID} should each trade-pair be?`,
  }


  const FormItems = [
    { label: 'Starting Value', value: options.startingValue, type: 'number', },
    { label: 'Skip First', value: options.skipFirst, type: 'checkbox', checked: (options.skipFirst) },
    { label: 'Ending Value', value: options.endingValue, type: 'number', },
    { label: 'Ignore Funds', value: options.ignoreFunds, type: 'checkbox', checked: (options.ignoreFunds) },
    { label: 'Increment Type', value: "dollars", type: 'first-radio', checked: (options.incrementType === "dollars" && true) },
    { label: 'Increment Type', value: "percentage", type: 'radio', checked: (options.incrementType === "percentage" && true) },
    { label: 'Increment', value: options.increment, type: 'number', },
    { label: 'Size Type', value: "quote", type: 'first-radio', checked: (options.sizeType === "quote") },
    { label: 'Size Type', value: "base", type: 'radio', checked: (options.sizeType === "base") },
    { label: 'Size', value: options.size, type: 'number', },
    { label: 'Size Curve', value: "linear", type: 'first-radio', checked: (options.sizeCurve === 'linear') },
    { label: 'Size Curve', value: "curve", type: 'radio', checked: (options.sizeCurve === "curve") },
    { label: 'Max Size', value: options.maxSize, type: 'number', hidden: options.sizeCurve === 'linear' },
    { label: 'Steepness', value: options.steepness, type: 'number', hidden: (options.sizeCurve === 'linear') },
    { label: 'Trade Pair Ratio', value: options.tradePairRatio, type: 'number', },
  ]

  // const resultsItems = [
  //   { text: `The buy price of the last trade-pair will be close to:`, value: numberWithCommas(setupResults?.lastBuyPrice?.toFixed(pqd) || 0), hidden: false },
  //   { text: `Approximate number of trades to create:`, value: numberWithCommas(setupResults?.orderList.length || 0), hidden: false },
  //   {}
  // ]


  return (
    <div className="AutoSetup settings-panel scrollable">
      {/* <div className="divider" /> */}
      {/* {options && Object.keys(options).map((key, index) => {
        return (<span key={index}>{key}: {JSON.stringify(options[key])}<br /></span>)
      })} */}

      <h4>Auto Setup</h4>
      {
        props.tips &&
        <p>
          This will automatically set up your products and investment based on the
          current price of Bitcoin.
        </p>
      }
      {/* <p>Coming soon<DotLoader /></p> */}

      {
        props.tips && <>
          <p>
            Enter the parameters you want and the bot will keep placing trades for you based on
            those parameters until you run out of cash, or until you have 10,000 trade-pairs.
            This is much easier than manually placing dozens of trades if they are following a basic pattern.
          </p>
          <p>
            Please be aware that the bot may slow down slightly with extremely large numbers of trades.
          </p>
        </>
      }

      < div className='auto-setup-form-and-results' >
        <form className='auto-setup-form left-border' >
          <p>Current price: {quoteID === 'USD' && '$'}{Number(currentPrice).toFixed(pqd)}</p>

          {FormItems.map((item, index) => (
            <FormItem
              key={index}
              label={item.label}
              value={item.value}
              type={item.type}
              checked={item.checked}
              hidden={item.hidden}
              changeCallback={handleInputChange}
              tips={props.tips ? tips : {}}
            />
          ))}
        </form>
        <br />

        {recentInput
          ? <div className='auto-setup-results'><h4>Calculating Results</h4><CaratWaveLoader /></div>
          : setupResults ? <div className='auto-setup-results'>
            <h4>Results</h4>
            {/* LAST BUY PRICE */}
            <p>
              The buy price of the last trade-pair will be close to:
              <br />
              <strong>{numberWithCommas(setupResults.lastBuyPrice?.toFixed(pqd) || 0)}</strong>
            </p>
            {/* NUMBER OF TRADES */}
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

            {options.ignoreFunds
              ? <>
                <p>
                  Total USD cost at current price:<br />
                  <strong>
                    {quoteID === 'USD' && '$'}{numberWithCommas(((setupResults.cost) > 0
                      ? setupResults.cost
                      : 0).toFixed(pqd))}
                    {quoteID !== 'USD' && quoteID}
                  </strong>
                </p>
                <p>
                  {quoteID} to reserve:<br />
                  <strong
                    className={`${quoteNeeded > 0 ? 'warning' : ''}`}
                  >{quoteID === 'USD' && '$'}{setupResults?.quoteToReserve.toFixed(pqd)} {quoteID !== 'USD' && quoteID}</strong>
                  {/* {quoteNeeded.toFixed(pqd)} - {quoteID} needed */}
                </p>
                <p>
                  {quoteID} you have:<br />
                  <strong
                    className={`${availableQuote < setupResults.quoteToReserve ? 'warning' : ''}`}
                  >{quoteID === 'USD' && '$'}{numberWithCommas(Number(availableQuote).toFixed(pqd))}</strong>
                  &nbsp;{!quoteNeeded ? `✓ You have enough` : `✗ You don't have enough`}
                </p>
                {quoteNeeded > 0 &&
                  <>
                    <p>
                      {quoteID} you need to obtain:<br />
                      <strong
                        className={`${availableQuote < setupResults.quoteToReserve ? 'warning' : ''}`}
                      >{quoteID === 'USD' && '$'}{numberWithCommas(Number(quoteNeeded).toFixed(pqd))}</strong>
                    </p>
                    {availableBaseValue > 0 &&
                      <p>
                        You can sell <strong
                          className={`${availableBaseValue < quoteNeeded ? 'warning' : ''}`}
                        >{numberWithCommas(availableBaseValue)} {baseID}</strong> for
                        <strong
                          className={`${availableBaseValue < quoteNeeded ? 'warning' : ''}`}
                        >&nbsp;{quoteID === 'USD' && '$'}{numberWithCommas(Number(availableBaseValue).toFixed(pqd))} {quoteID !== 'USD' && quoteID}</strong>
                        <br />
                        {availableBaseValue > quoteNeeded ? `✓ You have enough` : `✗ You don't have enough`} {baseID}
                      </p>}
                  </>
                }
                <p>
                  {baseID} to reserve:<br />
                  <strong>{numberWithCommas(setupResults.btcToBuy)}</strong>
                </p>
                <p>
                  {baseID} you have:<br />
                  <strong
                    className={`${availableBase < setupResults.btcToBuy ? 'warning' : ''}`}
                  >{numberWithCommas(Number(availableBase).toFixed(pbd))}</strong> {!baseNeeded ? `✓ You have enough` : `✗ You don't have enough`}
                </p>
                {baseNeeded > 0 &&
                  <p>
                    {baseID} you need to buy manually:<br />
                    <strong
                      className={`${availableBase < setupResults.btcToBuy ? 'warning' : ''}`}
                    >{numberWithCommas(Number(baseNeeded).toFixed(pbd))}</strong>
                  </p>
                }
                {baseNeeded > 0 &&
                  <p>
                    {numberWithCommas(baseNeeded)} {baseID} will cost you approximately:<br />
                    <strong
                      className={`${availableBase < setupResults.btcToBuy ? 'warning' : ''}`}
                    >{quoteID === 'USD' && '$'}{numberWithCommas((quoteNeededForBaseNeeded).toFixed(pqd))}</strong> {quoteID !== 'USD' && quoteID}
                  </p>
                }
                {/* {setupResults.cost}
                <br />
                {(Number(availableQuote) + Number(availableBaseValue))} */}

                {(setupResults.cost > 0) && (setupResults.cost > (Number(availableQuote) + Number(availableBaseValue))) &&
                  <p>
                    You will need to deposit <strong
                      className={`${availableBase < setupResults.btcToBuy ? 'warning' : ''}`}
                    >{quoteID === 'USD' && '$'}{numberWithCommas((setupResults.cost - availableQuote - availableBaseValue).toFixed(pqd))}
                    </strong> {quoteID !== 'USD' && quoteID} to satisfy the cost of the trades.
                  </p>
                }
              </>
              : <>
                <p>
                  It will cost you:<br />
                  <strong>${numberWithCommas(((setupResults.cost) > 0 ? setupResults.cost : 0).toFixed(pqd))}</strong>
                </p>
              </>
            }
          </div>
            : calculating && <p className='auto-setup-results'>Waiting for results<DotLoader /></p>
        }
      </div >
      <br />
      {
        confirmingAuto
          ? <Confirm
            text={
              `Are you sure you want to automatically set up the bot with these parameters?
               This will place ${setupResults?.orderList?.length} trades,
               and they will be placed immediately!`}
            execute={() => {
              setConfirmingAuto(false);
              submitAutoSetup();
            }}
            ignore={() => { setConfirmingAuto(false); }} />
          : !autoTradeStarted
            // ? <input className={`btn-store-api btn-blue medium ${user.theme}`} type="submit" name="submit" value="Start Setup" />
            // ? <button className={`btn-store-api btn-blue medium ${user.theme}`} onClick={submitAutoSetup}>Start Setup</button>
            ? <button
              className={`btn-store-api btn-blue medium ${user.theme}`}
              onClick={(e) => { no(e); setConfirmingAuto(true) }}
            >Start Setup</button>
            : autoTradeStarted
              ? <p>Auto setup started...</p>
              : <p>Awaiting confirmation...</p>
      }


      <h4>Review</h4>
      <button
        className={`btn-black ${theme}`}
        onClick={() => setShowPreview(!showPreview)}
      >
        {showPreview ? 'Hide Preview' : 'Show Preview'}
      </button>
      <button
        className={`btn-black ${theme}`}
        onClick={() => setShowGraph(!showGraph)}
      >
        {showGraph ? 'Hide Graph' : 'Show Graph'}
      </button>

      {(setupResults
        && setupResults.orderList.length > 0)
        && showGraph
        && <Graph data={setupResults.orderList} setupResults={{ ...setupResults, options: { ...options, currentPrice } }} />
      }

      {setupResults
        && showPreview
        && setupResults?.orderList?.length > 0
        && structuredClone(setupResults.orderList).reverse().map((order, i) => {
          return <SingleTrade key={i} order={order} preview={true} />
        })}

    </div >
  );
}

export default AutoSetup;