import React, { useState, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext.js';
import { useUser } from '../../../contexts/UserContext.js';
import { useSocket } from '../../../contexts/SocketProvider.js';
import { useFetchData } from '../../../hooks/fetchData.js';
import Collapser from '../../Collapser/Collapser.js';
import './Investment.css'


function Investment(props) {
  const { user, refreshUser, theme } = useUser();
  const { productID, refreshOrders, deadCon, profit } = useData();
  const { tickers } = useSocket();

  // the base currency will be the crypto, like BTC or FTX hahaha jk
  // the quote currency will be USD
  // const quoteID = user.availableFunds?.[productID]?.quote_currency;
  const baseID = user.availableFunds?.[productID]?.base_currency;
  const productPrice = Number(tickers?.[productID]?.price).toFixed(Number(user.availableFunds?.[productID]?.quote_increment.split('1')[0].length - 1));
  // const availableBase = user.availableFunds?.[productID]?.base_available;
  const spentBase = user.availableFunds?.[productID]?.base_spent;
  // const availableBaseValue = availableBase * productPrice;
  const spentBaseValue = spentBase * productPrice;
  // const availableQuote = user.availableFunds?.[productID]?.quote_available;
  const spentQuote = user.availableFunds?.[productID]?.quote_spent;
  // something is wrong here. We're combining numbers from individual products along with numbers from the entire portfolio

  // here was the problem. spentBaseValue is for all products, but spentQuote is only for the current product

  // this will return the total value of all base currency currently locked in orders
  const spentBaseAllProductsValue = getSpentBaseAllProductsValue();
  // next we need to get the spent quote for all products

  // changing this to spentQuoteAllProducts should fix it
  const spentQuoteAllProducts = getSpentQuoteAllProducts();
  // if you liquidated all your crypto products and cancelled all trades, this is how much USD you would have.
  // it does not account for fees, or any funds not held up in trades pairs.
  const portfolioValueLiquidized = spentBaseAllProductsValue + spentQuoteAllProducts;

  const currentProductValueLiquidized = spentBaseValue + spentQuote;

  // 3 month profit is the object in the profit array that has the "duration":"90 Day" property
  const ProfitCurrentProduct90Day = profit.find((item) => item.duration === '90 Day').productProfit || 0;
  const ProfitAllProducts90Day = profit.find((item) => item.duration === '90 Day').allProfit || 0;
  const currentProduct90DayAvg = ProfitCurrentProduct90Day / 90;
  const allProducts90DayAvg = ProfitAllProducts90Day / 90;

  // Feedback from user:
  // Would be nice to know projected annual profits by percent. 
  // Take the 90 day avg profit and multiply by 365 (days in a year) and divide by your Coinbase liquidized current cash.
  const projectedProfitAllProducts = portfolioValueLiquidized > 0 ? (((allProducts90DayAvg * 365) / portfolioValueLiquidized) * 100) : 0;
  const projectedProfitCurrentProduct = currentProductValueLiquidized > 0 ? (((currentProduct90DayAvg * 365) / currentProductValueLiquidized) * 100) : 0;

  // ROUTES
  const { updateData: updateBulkPairRatio } = useFetchData(`/api/orders/bulkPairRatio/${productID}`, { defaultState: null, noLoad: true });
  const { updateData: updateReinvest } = useFetchData(`/api/account/reinvest`, { defaultState: null, noLoad: true })
  const { updateData: updateReinvestRatio } = useFetchData(`/api/account/reinvestRatio`, { defaultState: null, noLoad: true })
  const { updateData: updateReserve } = useFetchData(`/api/account/reserve`, { defaultState: null, noLoad: true })
  const { updateData: updatePostMaxReinvest } = useFetchData(`/api/account/postMaxReinvestRatio`, { defaultState: null, noLoad: true })
  const { updateData: updateMaxTradeSize } = useFetchData(`/api/account/maxTradeSize`, { defaultState: null, noLoad: true })
  const { updateData: updateTradeMax } = useFetchData(`/api/account/tradeMax`, { defaultState: null, noLoad: true })

  // STATE
  const [reinvest_ratio, setReinvest_ratio] = useState(0);
  const [reserve, setReserve] = useState(0);
  const [bulk_pair_ratio, setBulk_pair_ratio] = useState(1.1);
  const [max_trade_size, setMaxTradeSize] = useState(30);
  const [postMaxReinvestRatio, setPostMaxReinvestRatio] = useState(0);


  // FUNCTIONS

  function getSpentBaseAllProductsValue() {
    // hold up, this isn't getting the spent base, it's getting the value of the spent base in the quote currency
    let total = 0;
    // look at every product in the user.availableFunds object
    for (let product in user.availableFunds) {
      const spentBase = user.availableFunds?.[product]?.base_spent;
      // console.log(user.availableFunds?.[product].base_spent, 'product')
      total += spentBase * tickers?.[product]?.price;
    }
    return total;
  }

  function getSpentQuoteAllProducts() {
    let total = 0;
    // look at every product in the user.availableFunds object
    for (let product in user.availableFunds) {
      const spentQuote = user.availableFunds?.[product]?.quote_spent;
      // console.log(user.availableFunds?.[product].base_spent, 'product')
      total += spentQuote;
    }
    return total;
  }

  async function storeMaxTradeSize() {
    await updateMaxTradeSize({ max_trade_size });
    deadCon && refreshUser();
  }

  async function savePostMaxReinvestRatio() {
    await updatePostMaxReinvest({ postMaxReinvestRatio });
    deadCon && refreshUser();
  }

  async function setBulkPairRatio() {
    await updateBulkPairRatio({ bulk_pair_ratio })
    deadCon && refreshOrders();
  }

  // this will toggle user reinvestment, and does not send any data
  async function reinvest() {
    await updateReinvest()
    deadCon && refreshUser();
  }

  async function reinvestRatio() {
    await updateReinvestRatio({ reinvest_ratio });
    deadCon && refreshUser();
  }

  async function saveReserve() {
    await updateReserve({ reserve });
    deadCon && refreshUser();
  }

  async function tradeMax() {
    await updateTradeMax();
    deadCon && refreshUser();
  }

  // EFFECTS

  // make sure ratio is within percentage range
  // hey this is probably not a good way to do this
  useEffect(() => {
    if (reinvest_ratio < 0) {
      setReinvest_ratio(0)
    }
  }, [reinvest_ratio]);

  useEffect(() => {
    setReinvest_ratio(user.reinvest_ratio)
  }, [user.reinvest_ratio])

  useEffect(() => {
    setMaxTradeSize(Number(user.max_trade_size))
  }, [user.max_trade_size])

  console.log(user.availableFunds, 'user.availableFunds')

  return (
    <div className="Investment settings-panel scrollable">
      <div className={`divider ${theme}`} />

      {/* STATISTICS */}
      {/* This section will show more detail about the portfolio */}
      {/* 
      Feedback from user:
      Would be nice to know projected annual profits by percent. 
      Take the 1 month profit and multiply by 12 and divide by your Coinbase liquidized current cash.
       */}
      {/* <h4>Statistics</h4> */}
      {/* <p>Current portfolio value: {user.portfolio_value}</p> */}
      {/* <p>Current available funds: {user.available_funds}</p> */}
      {/* {() => {
        const [collapse, setCollapse] = useState(true);
        return (
          <button>hello</button>
        )
      }} */}

      <Collapser title='Statistics (*EXPERIMENTAL*)'>

        <p>
          This feature is a work in progress. Here are some of the variables used in the
          calculation. The whole thing could be entirely wrong or inaccurate.
        </p>
        <p>Base ID: {baseID}</p>
        <p>All time profit: {user.profit}</p>
        {/* <p>All time profit: {JSON.stringify(profit)}</p> */}
        <p>ProfitCurrentProduct90Day: {JSON.stringify(ProfitCurrentProduct90Day)}</p>
        <p>ProfitAllProducts90Day: {JSON.stringify(ProfitAllProducts90Day)}</p>
        {/* <p>availableQuote: {JSON.stringify(availableQuote)}</p> */}
        <p>productPrice: {JSON.stringify(productPrice)}</p>
        {/* <p>availableBase: {JSON.stringify(availableBase)}</p> */}
        {/* <p>availableBaseValue: {JSON.stringify(availableBaseValue)}</p> */}
        <p>spentBase: {JSON.stringify(spentBase)}</p>
        <p>spentBaseValue: {JSON.stringify(spentBaseValue)}</p>
        <p>spentBaseAllProductsValue: {JSON.stringify(spentBaseAllProductsValue)}</p>
        <p>spentQuote: {JSON.stringify(spentQuote)}</p>
        <p>spentQuoteAllProducts: {JSON.stringify(spentQuoteAllProducts)}</p>
        <p>portfolioValueLiquidized: {JSON.stringify(portfolioValueLiquidized)}</p>
        <p>currentProductValueLiquidized: {JSON.stringify(currentProductValueLiquidized)}</p>
        <p>currentProduct90DayAvg: {JSON.stringify(currentProduct90DayAvg)}</p>
        <p>allProducts90DayAvg: {JSON.stringify(allProducts90DayAvg)}</p>
      </Collapser>
      <p>Projected annual profit for {baseID}: {projectedProfitCurrentProduct.toFixed(1)}%</p>
      {props.tips && <p>&#9653; This is based on the current total value of all your trades for {baseID} in USD, along with the last 3 months of profit data.</p>}
      <p>Projected annual profit for all products: {projectedProfitAllProducts.toFixed(1)}%</p>
      {props.tips && <p>&#9653; This is based on the current total value of all your entire portfolio in USD, along with the last 3 months of profit data.</p>}

      <div className="divider" />

      {/* REINVEST */}
      <h4>Reinvestment</h4>
      {props.tips && <p>Coinbot can try to reinvest your profits for you. Be aware that this may not
        work if the profit is too small.
      </p>}
      {(user.reinvest)
        ? <button className={`btn-blue medium ${user.theme}`} onClick={reinvest}>Turn off</button>
        : <button className={`btn-blue medium ${user.theme}`} onClick={reinvest}>Turn on</button>
      }
      {user.reinvest &&
        <>
          {((reinvest_ratio > 100) || (user.reinvest_ratio > 100)) &&
            <><p>** WARNING! ** </p>
              {props.tips && <p> Setting the reinvestment ratio higher than 100% will take money from your available funds!
                You will need to keep an eye on the bot and make sure you don't run out!</p>}</>
          }
          <p>Current reinvestment ratio: {user.reinvest_ratio}%</p>
          <label htmlFor="reinvest_ratio">
            Set Ratio:
          </label>
          <input
            type="number"
            name="reinvest_ratio"
            value={reinvest_ratio}
            step={10}
            // max={200}
            required
            onChange={(event) => setReinvest_ratio(event.target.value)}
          />
          <br />
          <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={(event) => { reinvestRatio(event) }}>Save reinvestment ratio</button>
          <div className={`divider ${theme}`} />
        </>
      }


      {/* RESERVE */}
      <h4>Reserve</h4>
      {props.tips && <p>
        Automatically turn off reinvestment when the available funds fall below a set amount.
        This will not be automatically turned back on for you.
      </p>}
      <div className='left-border'>
        <p>Current reserve: {user.reserve}</p>
        <label htmlFor="reserve">
          Set Reserve:
        </label>
        <input
          type="number"
          name="reserve"
          value={reserve}
          step={10}
          // max={200}
          required
          onChange={(event) => setReserve(event.target.value)}
        />
        <br />
        <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={(event) => { saveReserve(event) }}>Save reserve</button>
      </div>
      <div className={`divider ${theme}`} />



      {/* MAX TRADE SIZE USD */}
      {/* only show if reinvest is also turned on */}
      {
        user.reinvest &&
        <>
          <h4>Max Trade Size</h4>
          {props.tips && <p>
            Coinbot can try to limit the size of your trades. This is useful in case you want to
            stop reinvesting after a certain point, but keep reinvestment turned on for all other trades.
            Size cap is in USD. If set to 0, the bot will ignore it and default to the reinvestment ratio.
          </p>}
          {(user.max_trade)
            ? <button className={`btn-blue medium ${user.theme}`} onClick={() => { tradeMax() }}>Turn off</button>
            : <button className={`btn-blue medium ${user.theme}`} onClick={() => { tradeMax() }}>Turn on</button>
          }
          {user.max_trade &&
            <>
              <p>Current max trade size: ${Number(user.max_trade_size)}</p>
              <label htmlFor="reinvest_ratio">
                Set Max:
              </label>
              <input
                type="number"
                name="reinvest_ratio"
                value={max_trade_size}
                // step={10}
                // max={200}
                required
                onChange={(event) => setMaxTradeSize(Number(event.target.value))}
              />
              <br />
              <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={(event) => { storeMaxTradeSize(event) }}>Save Max</button>
              <>
                {props.tips && <p>How much of the profits should the bot reinvest after the max is hit?
                  Leave this at 0 to stop reinvestment after the max. If set above 0, there is no limit to how large the
                  size will get. Probably a good idea to stay under 100%</p>}
                {((postMaxReinvestRatio > 100) || (user.post_max_reinvest_ratio > 100)) &&
                  <p>** WARNING! ** <br /> Setting the reinvestment ratio higher than 100% will take money from your available funds!</p>
                }
                <p>Current post-max reinvestment ratio: {user.post_max_reinvest_ratio}%</p>
                <label htmlFor="postMaxReinvestRatio">
                  Set Ratio:
                </label>
                <input
                  type="number"
                  name="postMaxReinvestRatio"
                  value={postMaxReinvestRatio}
                  step={10}
                  // max={200}
                  required
                  onChange={(event) => setPostMaxReinvestRatio(event.target.value)}
                />
                <br />
                <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={(event) => { savePostMaxReinvestRatio(event) }}>Save post-max ratio</button>
                {/* <div className={`divider ${theme}`} /> */}
              </>
            </>
          }
          <div className={`divider ${theme}`} />
        </>
      }

      {/* BULK PERCENTAGE CHANGE */}
      <h4>Bulk Percentage Change</h4>
      {props.tips && <p>
        This will change the trade pair ratio for ALL trades to a uniform percentage. This can be useful for when your fees change due to trade volume and you want to change the ratio accordingly.
      </p>}
      <div className='left-border'>
        <label htmlFor="bulk_pair_ratio">
          New Ratio:
        </label>
        <input
          type="number"
          name="bulk_pair_ratio"
          value={bulk_pair_ratio}
          step={.1}
          max={100}
          min={0}
          required
          onChange={(event) => setBulk_pair_ratio(Number(event.target.value))}
        />
        <br />
        <button className={`btn-blue btn-bulk-pair-ratio medium ${user.theme}`} onClick={() => { setBulkPairRatio({ bulk_pair_ratio }) }}>Set all trades to new ratio</button>
      </div>
      <div className={`divider ${theme}`} />

    </div>
  );
}

export default Investment;