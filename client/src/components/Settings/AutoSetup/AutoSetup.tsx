import { DotLoader } from "../../Loading";
import { useWebSocket } from '../../../contexts/useWebsocket.js';
import { useData } from '../../../contexts/useData.js';
import { useEffect, useState } from "react";
import FormItem from "./FormItem.js";
import './AutoSetup.css';
import { useUser } from "../../../contexts/useUser.js";

function AutoSetup(props: { tips: boolean }) {
  const { tickers } = useWebSocket();
  const { productID, currentProduct, pqd, pbd } = useData();
  const currentPriceTicker = tickers[productID]?.price;
  const { user } = useUser();
  const baseID = user.availableFunds?.[productID]?.base_currency;

  const [currentPrice, setCurrentPrice] = useState(currentPriceTicker);

  if (!currentPriceTicker) return (
    <div className="AutoSetup settings-panel scrollable">
      <p>Waiting for price data<DotLoader /></p>
    </div>
  )

  if (!currentProduct) return (
    <div className="AutoSetup settings-panel scrollable">
      <p>Please select a product to start.</p>
    </div>
  )

  useEffect(() => {
    // if the price ticker is more than x% different than the current price, 
    // update the current price.
    // this will prevent too many re-renders trying to calculate the results
    // when the number and side of trades is not likely to change significantly
    const priceDifference = currentPriceTicker - currentPrice;
    const percentDifference = priceDifference / currentPrice;
    const absolutePercentDifference = Math.abs(percentDifference);
    console.log(absolutePercentDifference, 'percentDifference');

    if (absolutePercentDifference > 0.001) {
      setCurrentPrice(currentPriceTicker);
    }
  }, [currentPriceTicker, currentPrice])

  const [auto, setAuto] = useState({
    startingValue: ((currentPrice) / 2).toFixed(pqd),
    skipFirst: false,
    endingValue: ((currentPrice) * 1.5).toFixed(pqd),
    ignoreFunds: false,
    increment: 0.5,
    incrementType: 'percentage',
    size: 10,
    maxSize: 100,
    sizeType: 'quote',
    // trade_pair_ratio: 1.1,
    sizeCurve: 'linear',
    steepness: 10,
    trade_pair_ratio: 5
  });

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setAuto(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const tips = {
    startingValue: 'What dollar amount to start at?',
    endingValue: `What dollar amount to end at? (If not using all of your funds. \
    Checking 'Ignore Funds' will allow the bot to keep adding trades regardless of how \
    much cash you have until this limit is reached.)`,
    increment: `What ${auto.incrementType === "dollars" ? "dollar amount" : "percentage"} \
  to increment by?`,
    ratio: `What is the trade-pair percent increase \
  (how much each BUY should increase in price before selling)?`,
    sizeCurve: `Flat line: same size for each trade-pair
  Bell Curve: bigger size near current price`,
    size: `What size in ${auto.sizeType === "quote" ? "USD" : baseID} should each trade-pair be?`,
  }


  const FormItems = [
    { label: 'Starting Value', value: auto.startingValue, type: 'number', },
    { label: 'Skip First', value: auto.skipFirst, type: 'checkbox', },
    { label: 'Ending Value', value: auto.endingValue, type: 'number', },
    { label: 'Ignore Funds', value: auto.ignoreFunds, type: 'checkbox', },
    { label: 'Increment Type', value: "dollars", type: 'first-radio', checked: (auto.incrementType === "dollars" && true) },
    { label: 'Increment Type', value: "percentage", type: 'radio', checked: (auto.incrementType === "percentage" && true) },
    { label: 'Increment', value: auto.increment, type: 'number', },
    { label: 'Size Type', value: "quote", type: 'first-radio', checked: (auto.sizeType === "quote") },
    { label: 'Size Type', value: "base", type: 'radio', checked: (auto.sizeType === "base") },
    { label: 'Size', value: auto.size, type: 'number', },
    { label: 'Size Curve', value: "linear", type: 'first-radio', checked: (auto.sizeCurve === 'linear') },
    { label: 'Size Curve', value: "curve", type: 'radio', checked: (auto.sizeCurve === "curve") },
    { label: 'Max Size', value: auto.maxSize, type: 'number', hidden: auto.sizeCurve === 'linear' },
    { label: 'Steepness', value: auto.steepness, type: 'number', hidden: (auto.sizeCurve === 'linear') },
    { label: 'Trade Pair Ratio', value: auto.trade_pair_ratio, type: 'number', },
  ]


  return (
    <div className="AutoSetup settings-panel scrollable">
      {/* <div className="divider" /> */}
      {/* map the auto state object by key, one line for each value */}
      {/* {auto && Object.keys(auto).map((key, index) => {
        return (<span key={index}>{key}: {JSON.stringify(auto[key])}<br /></span>)
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
      </div>
    </div >
  );
}

export default AutoSetup;