import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';

// Basic class component structure for React with default state
// value setup. When making a new component be sure to replace
// the component name TemplateClass with the name for the new
// component.
function Trade(props) {

  // have this be the default value of whatever 0.001 worth of bitcoin is
  // will need a function to poll the current value every 5 seconds from CB api
  // todo - default transactionPrice value should automatically start out at the current price
  // of bitcoin, rounded to the closest $100
  const [transactionPrice, setTransactionPrice] = useState(30000);
  const [transactionAmount, setTransactionAmount] = useState(0.001);
  const dispatch = useDispatch();

  function submitTransaction(event) {
    event.preventDefault();
    dispatch({ type: 'START_TRADE', payload: {
      price: transactionPrice,
      size: transactionAmount,
    }})
    console.log(`the price is: $${transactionPrice} per 1 BTC`);
    console.log(`the amount is: ${transactionAmount} BTC`);
  }

  return (
    <div>
      <h2>Trade Component</h2>
      <p>
        {JSON.stringify(props)}
      </p>

      {/* todo - move links into the nav component */}
      <Link to="/">
        home
      </Link>

      <button
      onClick={ () => dispatch({ type: 'TOGGLE_BOT' }) }>
        toggle bot
      </button>
      <div>
        {/* form with a single input. Input takes a price point at which 
          to make a trade. todo - make function to send price to backend server */}
        <form onSubmit={submitTransaction} >
          <div>
            {/* input for setting the price/BTC per transaction. Can be adjusted in $500 steps, or manually input */}
            <label htmlFor="price">
              Trade price per 1 BTC (in USD):
              <input
                type="number"
                name="transaction_price"
                value={transactionPrice}
                // todo - this could possibly be changed to 100, or add a selector menu thing to toggle between different amounts
                step={500}
                required
                onChange={(event) => setTransactionPrice(event.target.value)}
              />
            </label>
          </div>
          <div>
            {/* input for setting how much bitcoin should be traded per transaction at the specified price */}
            <label htmlFor="amount">
              Trade amount (in BTC):
              <input
                type="number"
                name="transaction_amount"
                value={transactionAmount}
                step={0.001}
                required
                onChange={(event) => setTransactionAmount(event.target.value)}
              />
            </label>
          </div>
          {/* display some details about the new transaction that is going to be made */}
          <p>
            This will tell coinbot to start trading {transactionAmount} BTC 
            between the low purchase price of {transactionPrice} 
            and the high sell price of {Math.round(transactionPrice * 1.025)}. 
            The value in USD for the initial transaction will be about {transactionPrice * transactionAmount}
          </p>
          <input className="btn" type="submit" name="submit" value="Start Trading" />
        </form>
      </div>
    </div>
  );
}


export default connect(mapStoreToProps)(Trade);
