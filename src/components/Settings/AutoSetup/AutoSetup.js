import React, { useState } from 'react';
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
  // const [keepTrading, setKeepTrading] = useState(false);


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
            required
            onChange={(event) => setStartingValue(event.target.value)}
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
            required
            onChange={(event) => setIncrement(event.target.value)}
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
            required
            onChange={(event) => setTradePairRatio(event.target.value)}
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
            required
            onChange={(event) => setSize(event.target.value)}
          />
        </label>

        {/* SUBMIT */}
        <br />
        <br />
        <input className={`btn-store-api btn-blue medium ${props.theme}`} type="submit" name="submit" value="Start Trading" />
      </form>

      <div className="divider" />
    </div>
  );
}

export default connect(mapStoreToProps)(AutoSetup);