import { DotLoader, WaveLoader } from "../../Loading";
import { useWebSocket } from '../../../contexts/useWebsocket.js';
import { useData } from '../../../contexts/useData.js';
import { useEffect, useState } from "react";
import FormItem from "./FormItem.js";
import './AutoSetup.css';
import { useUser } from "../../../contexts/useUser.js";
import useAutoSetup from "./useAutoSetup.js";
import { numberWithCommas } from "../../../shared.js";

function AutoSetup(props: { tips: boolean }) {
  const { tickers } = useWebSocket();
  const { productID, currentProduct, pqd, pbd } = useData();
  const currentPriceTicker = tickers[productID]?.price;
  const { user } = useUser();
  const baseID = user.availableFunds?.[productID]?.base_currency;

  const availableQuote = user.availableFunds?.[productID]?.quote_available;
  const availableBase = user.availableFunds?.[productID]?.base_available;

  const [currentPrice, setCurrentPrice] = useState(currentPriceTicker);

  const { result: setupResults, options, setOptions, calculating, recentInput } = useAutoSetup(user, currentPrice, pqd);

  if (!currentPriceTicker) return (
    <div className="AutoSetup settings-panel scrollable">
      <p>Waiting for price data<DotLoader /></p>
    </div>
  )

  // if (!currentProduct) return (
  //   <div className="AutoSetup settings-panel scrollable">
  //     <p>Please select a product to start.</p>
  //   </div>
  // )

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


  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = event.target;
    console.log(`changing ${name} which is type:${type} to ${Boolean(value)} (${!value})`, Boolean(value));

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
    size: `What size in ${options.sizeType === "quote" ? "USD" : baseID} should each trade-pair be?`,
  }


  const FormItems = [
    { label: 'Starting Value', value: options.startingValue, type: 'number', },
    { label: 'Skip First', value: options.skipFirst, type: 'checkbox', },
    { label: 'Ending Value', value: options.endingValue, type: 'number', checked: (options.endingValue) },
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
          <p>Current price: {currentPrice}</p>

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
          ? <div className='auto-setup-results'><h4>Calculating Results</h4><WaveLoader /></div>
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
                  Total USD cost at current price:
                  <br />
                  <strong>${numberWithCommas(((setupResults.cost) > 0 ? setupResults.cost : 0).toFixed(2))}</strong>
                </p>
                <p>
                  USD to reserve:
                  <br />
                  <strong> {setupResults?.quoteToReserve.toFixed(pqd)}</strong>
                </p>
                <p>
                  {baseID} to reserve:
                  <br />
                  <strong>{numberWithCommas(setupResults.btcToBuy)}</strong>
                </p>
                <p>
                  {baseID} you have:
                  <br />
                  <strong>{numberWithCommas(Number(availableBase).toFixed(pbd))}</strong>
                </p>
                <p>
                  {baseID} you need to buy manually:
                  <br />
                  <strong>{numberWithCommas(((setupResults.btcToBuy - availableBase) > 0 ? setupResults.btcToBuy - availableBase : 0).toFixed(pbd))}</strong>
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

            <p>Cost: {setupResults?.cost}</p>
            <p>Quote to reserve: {setupResults?.quoteToReserve}</p>
            <p>Buy count: {setupResults?.buyCount}</p>
            <p>Sell count: {setupResults?.sellCount}</p>
            <p>Valid: {setupResults?.valid ? 'true' : 'false'}</p>
            {/* <p>Options: {JSON.stringify(setupResults?.options)}</p> */}
          </div>
            : !calculating && <p className='auto-setup-results'>Waiting for results<DotLoader /></p>
        }

      </div >
    </div >
  );
}

export default AutoSetup;