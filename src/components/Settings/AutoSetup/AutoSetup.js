import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../../redux/mapStoreToProps';
import './AutoSetup.css'


function AutoSetup(props) {
  const dispatch = useDispatch();

  const [startingValue, setStartingValue] = useState(1000);
  const [increment, setIncrement] = useState(100);
  const [size, setSize] = useState(10);
  const [transactionProduct, setTransactionProduct] = useState('BTC-USD');
  const [tradePairRatio, setTradePairRatio] = useState(1.1);
  const [setupResults, setSetupResults] = useState(1);
  // const [keepTrading, setKeepTrading] = useState(false);


  useEffect(() => {
    if (size) {

      calculateResults();
    }
    // return () => {
    //   cleanup
    // }
  }, [startingValue, increment, size])



  function calculateResults() {
    let availableFunds = props.store.accountReducer.accountReducer;
    let startingPrice = startingValue;
    let finalPrice = startingPrice;
    setSetupResults(startingValue)

    while (size <= availableFunds) {
      // each loop needs to buy BTC with the USD size
      // this will lower the value of available funds by the size
      availableFunds -= size;
      // then it will increase the final price by the increment value
      finalPrice += increment;
    }


    setSetupResults(finalPrice)


  }


  function submitAutoSetup(event) {
    event.preventDefault();
    console.log('automatically setting up bot');
    // setKeepTrading(true);
    autoTrader();
  }

  function autoTrader() {
    let availableFunds = props.store.accountReducer.accountReducer;
    console.log('here is the current available funds', availableFunds);

    dispatch({
      type: 'AUTO_SETUP', payload: {
        startingValue: startingValue,
        increment: increment,
        trade_pair_ratio: tradePairRatio,
        size: size,
        product_id: transactionProduct,
        // type: type
      }
    })

    // if there is enough cash left to keep setting up pairs, call the function again
    // if (availableFunds > size) {
    //   console.log('there is enough money');
    //   setTimeout(() => {
    //     autoTrader();
    //   }, 2000);
    // }

  }

  return (
    <div className="AutoSetup">
      <div className="divider" />
      <h4>Auto Setup</h4>
      <p>
        Enter the parameters you want and the bot will keep placing trades for you based on
        those parameters until you run out of cash, or until you have 1000 trade-pairs.
        This is much easier than manually placing dozens of trades if they are following a basic pattern.
      </p>
      <p>
        Please be aware that placing over 1000 trade-pairs will greatly slow down the bot and may decrease profits.
      </p>

      <div className="divider" />
      <div className='auto-setup-form-and-results'>

        <form className='auto-setup-form' onSubmit={submitAutoSetup}>

          {/* STARTING VALUE */}
          <p>What dollar amount to start at?</p>
          <label htmlFor='startingValue'>
            Starting Value:
            <br />
            <input
              name='startingValue'
              type='number'
              value={startingValue}
              step={1000}
              required
              onChange={(event) => setStartingValue(Number(event.target.value))}
            />
          </label>

          {/* INCREMENT */}
          <p>What dollar amount to increment by?</p>
          <label htmlFor='increment'>
            Increment:
            <br />
            <input
              name='increment'
              type='number'
              value={increment}
              step={10}
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
              step={.1}
              required
              onChange={(event) => setTradePairRatio(Number(event.target.value))}
            />
          </label>

          {/* SIZE */}
          <p>What size in USD should each trade-pair be?</p>
          <label htmlFor='size'>
            Size in USD:
            <br />
            <input
              name='size'
              type='number'
              value={size}
              step={5}
              min={1}
              required
              onChange={(event) => setSize(Number(event.target.value))}
            />
          </label>

          {/* SUBMIT */}
          <br />
          <br />
          <input className={`btn-store-api btn-blue medium ${props.theme}`} type="submit" name="submit" value="Start Trading" />
        </form>

        <div className='auto-setup-results'>
          <p>
            The price of the last trade-pair will be close to:
          </p>
          <p>
            <strong>{setupResults}</strong>
          </p>
          <p>
            This will likely be higher if trades are placed higher than the current price of BTC, as they
            will cost less. It can also change if the price of BTC moves up or down significantly while the 
            trades are being set up.
          </p>

        </div>
      </div>

      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(AutoSetup);