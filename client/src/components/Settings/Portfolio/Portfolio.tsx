import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../../../hooks/useUser.js';
import { useData } from '../../../hooks/useData.js';
import Collapser from '../../Collapser/Collapser.js';
import './Portfolio.css';
import usePutFetch from '../../../hooks/usePutFetch.js';
import { useWebSocket } from '../../../hooks/useWebsocket.js';
import useDownloadFile from '../../../hooks/useDownloadFile.js';
import useGetFetch from '../../../hooks/useGetFetch.js';
import useDeleteFetch from '../../../hooks/useDeleteFetch.js';


function Portfolio(props: { tips: boolean }) {
  const { user, refreshUser, theme } = useUser();
  const { productID, syncOrders, refreshOrders, profit, pqd, } = useData();
  const { tickers } = useWebSocket();
  const [lowerLimit, setLowerLimit] = useState(0);
  const [upperLimit, setUpperLimit] = useState(0);

  // the base currency will be the crypto, like BTC or FTX hahaha jk
  // the quote currency will be USD
  const baseID = user.availableFunds?.[productID]?.base_currency;
  const productPrice = Number(tickers?.[productID]?.price).toFixed(pqd);
  const spentBase = user.availableFunds?.[productID]?.base_spent;
  const spentBaseValue = spentBase * Number(productPrice);
  const spentQuote = Number(user.availableFunds?.[productID]?.quote_spent_on_product);
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

  const currentProductValueLiquidized = spentBaseValue + Number(spentQuote);

  // 3 month profit is the object in the profit array that has the "duration":"90 Day" property
  const ProfitCurrentProduct90Day = profit.find((item) => item.duration === '90 Day')?.productProfit || 0;
  const ProfitAllProducts90Day = profit.find((item) => item.duration === '90 Day')?.allProfit || 0;
  const currentProduct90DayAvg = ProfitCurrentProduct90Day / 90;
  const allProducts90DayAvg = ProfitAllProducts90Day / 90;

  // Feedback from user:
  // Would be nice to know projected annual profits by percent. 
  // Take the 90 day avg profit and multiply by 365 (days in a year) and divide by your Coinbase liquidized current cash.
  const projectedProfitAllProducts = portfolioValueLiquidized > 0 ? (((allProducts90DayAvg * 365) / portfolioValueLiquidized) * 100) : 0;
  const projectedProfitCurrentProduct = currentProductValueLiquidized > 0 ? (((currentProduct90DayAvg * 365) / currentProductValueLiquidized) * 100) : 0;

  // ROUTES

  const { putData: updateBulkPairRatio } = usePutFetch({
    url: `/api/orders/bulkPairRatio/${productID}`,
    from: 'updateBulkPairRatio in data context',
    refreshCallback: refreshOrders,
  });

  const { putData: updateReinvest } = usePutFetch({
    url: `/api/account/reinvest`,
    from: 'updateReinvest in data context',
    refreshCallback: refreshUser,
  });

  const { putData: updateReinvestRatio } = usePutFetch({
    url: `/api/account/reinvestRatio`,
    from: 'updateReinvestRatio in data context',
    refreshCallback: refreshUser,
  });

  const { putData: updateReserve } = usePutFetch({
    url: `/api/account/reserve`,
    from: 'updateReserve in data context',
    refreshCallback: refreshUser,
  });

  const { putData: updatePostMaxReinvest } = usePutFetch({
    url: `/api/account/postMaxReinvestRatio`,
    from: 'updatePostMaxReinvest in data context',
    refreshCallback: refreshUser,
  });

  const { putData: updateMaxTradeSize } = usePutFetch({
    url: `/api/account/maxTradeSize`,
    from: 'updateMaxTradeSize in data context',
    refreshCallback: refreshUser,
  });

  const { putData: updateTradeMax } = usePutFetch({
    url: `/api/account/tradeMax`,
    from: 'updateTradeMax in data context',
    refreshCallback: refreshUser,
  });

  const { downloadFile, downloadTxt } = useDownloadFile({
    url: `/api/account/downloadFile`,
    from: 'downloadFile in History'
  })

  const currentJSONOptions = useMemo(() => ({
    url: `/api/account/exportCurrentJSON`,
    defaultState: null,
    from: 'currentJSON in History',
    preload: false,
  }), []);
  const {
    data: currentJSON,
    refresh: exportCurrentJSON,
    clear: clearCurrentJSON,
  } = useGetFetch(currentJSONOptions)

  const { deleteData: deleteRangeForProduct } = useDeleteFetch({
    url: `/api/orders/${productID}/${lowerLimit}/${upperLimit}`,
    from: 'deleteRangeForProduct in bulk delete',
    refreshCallback: refreshOrders,
  })

  const { deleteData: deleteAllForProduct } = useDeleteFetch({
    url: `/api/orders/product/${productID}`,
    from: 'deleteAllForProduct in bulk delete',
    refreshCallback: refreshOrders,
  })

  const { deleteData: deleteAll } = useDeleteFetch({
    url: `/api/orders`,
    from: 'deleteAll in bulk delete',
    refreshCallback: refreshOrders,
  })

  function copyToClipboard() {
    navigator.clipboard.writeText(JSON.stringify(currentJSON));
  }

  const starterReserve = Number(Number(user.reserve).toFixed(pqd));

  // STATE
  const [reinvest_ratio, setReinvest_ratio] = useState(0);
  const [reserve, setReserve] = useState(starterReserve);
  const [bulk_pair_ratio, setBulk_pair_ratio] = useState(5);
  const [max_trade_size, setMaxTradeSize] = useState(30);
  const [postMaxReinvestRatio, setPostMaxReinvestRatio] = useState(0);


  // FUNCTIONS

  function getSpentBaseAllProductsValue() {
    // hold up, this isn't getting the spent base, it's getting the value of the spent base in the quote currency
    let total = 0;
    // look at every product in the user.availableFunds object
    for (const product in user.availableFunds) {
      const spentBase = user.availableFunds?.[product]?.base_spent;
      // console.log(user.availableFunds?.[product].base_spent, 'product')
      total += spentBase * Number(tickers?.[product]?.price);
    }
    return total;
  }

  function getSpentQuoteAllProducts() {
    let total = 0;
    // look at every product in the user.availableFunds object
    for (const product in user.availableFunds) {
      const spentQuote = user.availableFunds?.[product]?.quote_spent_on_product;
      // console.log(user.availableFunds?.[product].base_spent, 'product')
      total += spentQuote;
    }
    return total;
  }

  // // this will toggle user reinvestment, and does not send any data
  // async function reinvest() {
  //   await updateReinvest()
  //   deadCon && refreshUser();
  // }

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

  // console.log(user.availableFunds, 'user.availableFunds')

  return (
    <div className="Portfolio settings-panel scrollable">
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
        <div className='left-border'>
          <Collapser title='More'>
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
          {props.tips && <p>
            &#9653; {'<?>'} This is based on the current total value of all your trades for {baseID} in USD, along with the last 3 months of profit data.</p>}
          <p>Projected annual profit for all products: {projectedProfitAllProducts.toFixed(1)}%</p>
          {props.tips && <p>
            &#9653; {'<?>'} This is based on the current total value of all your entire portfolio in USD, along with the last 3 months of profit data.</p>}
        </div>

      </Collapser>
      <div className={`divider ${theme}`} />

      {/* REINVEST */}
      {/* <h4>Reinvestment</h4> */}
      <Collapser title='Reinvestment'>
        <div className='left-border'>
          {props.tips && <p>
            {'<?>'} Coinbot can try to reinvest your profits for you. Be aware that this may not
            work if the profit is too small.
          </p>}
          {(user.reinvest)
            ? <button className={`btn-blue medium ${user.theme}`} onClick={() => { updateReinvest() }}>Turn off</button>
            : <button className={`btn-blue medium ${user.theme}`} onClick={() => { updateReinvest() }}>Turn on</button>
          }
          {user.reinvest &&
            <>
              {((reinvest_ratio > 100) || (user.reinvest_ratio > 100)) &&
                <><p>** WARNING! ** </p>
                  {props.tips && <p>
                    {'<?>'} Setting the reinvestment ratio higher than 100% will take money from your available funds!
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
                onChange={(event) => setReinvest_ratio(Number(event.target.value))}
              />
              <br />
              <button
                className={`btn-blue btn-reinvest medium ${user.theme}`}
                onClick={() => { updateReinvestRatio({ reinvest_ratio }) }}
              >
                Save reinvestment ratio
              </button>
              <div className={`divider ${theme}`} />
            </>
          }
          <div className='leftish-border'>
            {user.reinvest &&
              <>
                {/* RESERVE */}
                {/* <h4>Reserve</h4> */}
                <Collapser title='Reserve'>
                  {props.tips && <p>
                    {'<?>'} Automatically turn off reinvestment when the available funds fall below a set amount.
                    This will not be automatically turned back on for you.
                  </p>}
                  <p>Current reserve: {Number(user.reserve).toFixed(pqd)}</p>
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
                    onChange={(event) => setReserve(Number(event.target.value))}
                  />
                  <br />
                  <button
                    className={`btn-blue btn-reinvest medium ${user.theme}`}
                    onClick={() => { updateReserve({ reserve }) }}
                  >
                    Save reserve
                  </button>
                  {/* <div className={`divider ${theme}`} /> */}
                </Collapser>
                <div className={`divider ${theme}`} />
              </>
            }
            {/* </div> */}


            {/* MAX TRADE SIZE USD */}
            {/* only show if reinvest is also turned on */}
            {/* <div className='left-border'> */}
            {
              user.reinvest &&
              <>
                {/* <h4>Max Trade Size</h4> */}
                <Collapser title='Max Trade Size'>

                  {props.tips && <p>
                    {'<?>'} Coinbot can try to limit the size of your trades. This is useful in case you want to
                    stop reinvesting after a certain point, but keep reinvestment turned on for all other trades.
                    Size cap is in USD. If set to 0, the bot will ignore it and default to the reinvestment ratio.
                  </p>}
                  {(user.max_trade)
                    ? <button className={`btn-blue medium ${user.theme}`} onClick={() => { updateTradeMax() }}>Turn off</button>
                    : <button className={`btn-blue medium ${user.theme}`} onClick={() => { updateTradeMax() }}>Turn on</button>
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
                      <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={() => { updateMaxTradeSize({ max_trade_size }) }}>Save Max</button>
                    </>
                  }
                  {user.max_trade &&
                    <>
                      {props.tips && <p>
                        {'<?>'} How much of the profits should the bot reinvest after the max is hit?
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
                        onChange={(event) => setPostMaxReinvestRatio(Number(event.target.value))}
                      />
                      <br />
                      <button className={`btn-blue btn-reinvest medium ${user.theme}`} onClick={() => { updatePostMaxReinvest({ postMaxReinvestRatio }) }}>Save post-max ratio</button>
                      {/* <div className={`divider ${theme}`} /> */}
                    </>
                  }
                </Collapser>
                <div className={`divider ${theme}`} />
              </>
            }
          </div>
        </div>
      </Collapser>

      <div className={`divider ${theme}`} />


      {/* BULK PERCENTAGE CHANGE */}
      {/* <h4>Bulk Percentage Change</h4> */}
      <Collapser title='Bulk Percentage Change'>
        <div className='left-border'>
          {props.tips && <p>
            {'<?>'} This will change the trade pair ratio for ALL trades to a uniform percentage. This can be useful for when your fees change due to trade volume and you want to change the ratio accordingly.
          </p>}
          <label htmlFor="bulk_pair_ratio">
            New Ratio:
          </label>
          <input
            type="number"
            name="bulk_pair_ratio"
            value={bulk_pair_ratio}
            step={1}
            max={100}
            min={0}
            required
            onChange={(event) => setBulk_pair_ratio(Number(event.target.value))}
          />
          <br />
          <button
            className={`btn-blue btn-bulk-pair-ratio medium ${user.theme}`}
            onClick={() => { updateBulkPairRatio({ bulk_pair_ratio }) }}
          >
            Set all trades to new ratio
          </button>
        </div>
      </Collapser>



      {/* SYNC ALL TRADES */}
      <div className={`divider ${theme}`} />
      {/* <h4>Synchronize All Trades</h4> */}
      <Collapser title='Synchronize All Trades' >
        <div className='left-border'>
          {props.tips && <p>
            {'<?>'} This will delete all open orders from coinbase and replace them based on the trades stored in the
            database. It can sometimes fix issues that cause repeated errors, and may take a few minutes to complete.
          </p>}
          <button className={`btn-blue medium ${user.theme}`} onClick={() => { syncOrders() }}>Sync All Trades</button>
        </div>
      </Collapser>




      <div className={`divider ${theme}`} />


      <Collapser title='Export current trade-pairs'>
        <div className='left-border'>
          {!currentJSON &&
            <p>
              Export all your current trade-pairs in JSON format.
              {/* You can copy this to a text document
                and use it later to import the same trades. This is useful if you want to transfer your
                trades to a different bot and can't or don't want to mess around with the database. */}
            </p>
          }
          {!currentJSON &&
            <button
              className={`btn-red medium ${user.theme}`}
              onClick={() => { exportCurrentJSON() }}
            >Export</button>
          }
          {currentJSON &&
            <p>
              Copy it into your clipboard and paste it somewhere, or just download it as a .txt file.
            </p>
          }
          {currentJSON &&
            <button
              className={`btn-blue medium ${user.theme}`}
              onClick={() => { copyToClipboard() }}
            >Copy All</button>
          }
          {currentJSON &&
            <button
              className={`btn-yellow btn-file medium ${user.theme}`}
              onClick={() => downloadTxt(JSON.stringify(currentJSON),
                `${productID}_active_trades_${new Date().toISOString().slice(0, 10)}.txt`)}
            >Download as .txt
            </button>
          }
          <br />
          &nbsp;
          {currentJSON &&
            <textarea
              rows={4}
              cols={29}
              value={JSON.stringify(currentJSON)}
              // don't allow editing of the text area
              readOnly
            />
          }
          <br />
          {currentJSON &&
            <button
              className={`btn-red medium ${user.theme}`}
              onClick={() => { clearCurrentJSON() }}
            >Clear</button>}
        </div>
      </Collapser>
      {/* <br /> */}

      <div className={`divider ${theme}`} />
      {/* DELETE RANGE */}
      {/* <h4>Delete Range</h4> */}
      <Collapser title={`Delete Range for ${productID}`} >
        <div className='left-border'>
          {props.tips && <p>
            {'<?>'} Delete all trades that fall within a price range, inclusive of the numbers set. This is based on the current price,
            so if the trade is a buy, it will look at the buy price. If it is a sell, it will look at the sell price.
          </p>}
          {/* <div className='left-border'> */}
          <label htmlFor="upper_limit">
            Upper Limit:
          </label>
          <input
            type="number"
            name="upper_limit"
            value={upperLimit}
            required
            onChange={(event) => setUpperLimit(Number(event.target.value))}
          />

          <br />

          <label htmlFor="lower_limit">
            Lower Limit:
          </label>
          <input
            type="number"
            name="lower_limit"
            value={lowerLimit}
            required
            onChange={(event) => setLowerLimit(Number(event.target.value))}
          />

          <br />
          <br />

          <button className={`btn-red medium ${user.theme}`} onClick={() => { deleteRangeForProduct() }}>Delete Range For {productID}</button>
        </div>
      </Collapser>

      {/* DELETE ALL TRADES FOR CURRENT PRODUCT */}

      <div className={`divider ${theme}`} />
      {/* <h4>Delete All Trades for {productID}</h4> */}
      <Collapser title={`Delete All Trades for ${productID}`} >
        <div className='left-border'>
          <p>Danger! This button will delete all your positions for {productID}! Press it carefully!</p>
          <button className={`btn-red medium ${user.theme}`} onClick={() => { deleteAllForProduct() }}>Delete All {productID}</button>
        </div>
      </Collapser>

      {/* DELETE ALL TRADES */}
      <div className={`divider ${theme}`} />
      {/* <h4>Delete All Trades</h4> */}
      <Collapser title='Delete All Trades' >
        <div className='left-border'>
          <p>Danger! This button will delete ALL your positions for ALL your products! Not just {productID}! Press it carefully!</p>
          <button className={`btn-red medium ${user.theme}`} onClick={() => { deleteAll() }}>Delete All</button>
        </div>
      </Collapser>

      <div className={`divider ${theme}`} />
    </div>
  );
}

export default Portfolio;