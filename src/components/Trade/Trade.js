import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './Trade.css';


// Basic class component structure for React with default state
// value setup. When making a new component be sure to replace
// the component name TemplateClass with the name for the new
// component.
function Trade(props) {

  // have this be the default value of whatever 0.001 worth of bitcoin is
  // will need a function to poll the current value every 5 seconds from CB api
  // todo - default transactionPrice value should automatically start out at the current price
  // of bitcoin, rounded to the closest $100
  const [transactionSide, setTransactionSide] = useState('buy');
  const [transactionPrice, setTransactionPrice] = useState(30000);
  const [flippedPrice, setFlippedPrice] = useState(30000);
  const [transactionAmount, setTransactionAmount] = useState(0.001);
  const [transactionProduct, setTransactionProduct] = useState('BTC_USD');
  const [TradePairRatio, setTradePairRatio] = useState('BTC_USD');
  const dispatch = useDispatch();

  function submitTransaction(event) {
    event.preventDefault();
    dispatch({
      type: 'START_TRADE', payload: {
        side: transactionSide,
        price: transactionPrice,
        size: transactionAmount,
      }
    })
    console.log(`the price is: $${transactionPrice} per 1 BTC`);
    console.log(`the amount is: ${transactionAmount} BTC`);
  }

  return (
    <div className="Trade" >
      <h3 className="title">New Trade Position</h3>
      {/* <div> */}
      {/* form with a single input. Input takes a price point at which 
          to make a trade */}
      <form className="new-trade-form" onSubmit={submitTransaction} >
        <div className="number-inputs">
          {/* input for setting the price/BTC per transaction. Can be adjusted in $500 steps, or manually input */}
          <label htmlFor="transaction_price">
            Trade price per 1 BTC (in USD):
            </label>
            <input
              type="number"
              name="transaction_price"
              value={Number(transactionPrice)}
              // todo - this could possibly be changed to 100, or add a selector menu thing to toggle between different amounts
              step={100}
              required
              onChange={(event) => setTransactionPrice(event.target.value)}
            />
          <div className="increment-buttons">
            <div className="increase">
              <input type="button" onClick={(event) => setTransactionPrice(transactionPrice + 1000)} value="+1000"></input>
              <input type="button" onClick={(event) => setTransactionPrice(transactionPrice + 100)} value="+100"></input>
              <input type="button" onClick={(event) => setTransactionPrice(transactionPrice + 10)} value="+10"></input>
            </div>
            <div className="decrease">
              <input type="button" onClick={(event) => setTransactionPrice(transactionPrice - 1000)} value="-1000"></input>
              <input type="button" onClick={(event) => setTransactionPrice(transactionPrice - 100)} value="-100"></input>
              <input type="button" onClick={(event) => setTransactionPrice(transactionPrice - 10)} value="-10"></input>
            </div>
          </div>
        </div>
        <div className="number-inputs">
          {/* input for setting how much bitcoin should be traded per transaction at the specified price */}
          <label htmlFor="transaction_amount">
            Trade amount (in BTC):
          </label>
          <input
            type="number"
            name="transaction_amount"
            value={Number(transactionAmount)}
            // step={0.001}
            required
            onChange={(event) => setTransactionAmount(event.target.value)}
          />
          <div className="increment-buttons">
            <div className="increase">
              <input type="button" onClick={(event) => setTransactionAmount(Math.round(transactionAmount * 1000 + 1000) / 1000)} value="+1"></input>
              <input type="button" onClick={(event) => setTransactionAmount(Math.round(transactionAmount * 1000 + 100) / 1000)} value="+.100"></input>
              <input type="button" onClick={(event) => setTransactionAmount(Math.round(transactionAmount * 1000 + 10) / 1000)} value="+.010"></input>
              <input type="button" onClick={(event) => setTransactionAmount(Math.round(transactionAmount * 1000 + 1) / 1000)} value="+.001"></input>
            </div>
            <div className="decrease">
              <input type="button" onClick={(event) => setTransactionAmount(Math.round(transactionAmount * 1000 - 1000) / 1000)} value="-1"></input>
              <input type="button" onClick={(event) => setTransactionAmount(Math.round(transactionAmount * 1000 - 100) / 1000)} value="-.100"></input>
              <input type="button" onClick={(event) => setTransactionAmount(Math.round(transactionAmount * 1000 - 10) / 1000)} value="-.010"></input>
              <input type="button" onClick={(event) => setTransactionAmount(Math.round(transactionAmount * 1000 - 1) / 1000)} value="-.001"></input>
            </div>
          </div>
        </div>
        {/* display some details about the new transaction that is going to be made */}
      <p className="trade-description">
        This will tell coinbot to start trading {transactionAmount} BTC
        between the low purchase price of ${transactionPrice} and
        the high sell price of ${((Math.round((transactionPrice * 1.03) * 100)) / 100)}.
        The value in USD for the initial transaction will be about ${((Math.round((transactionPrice * transactionAmount) * 100)) / 100)}.
      </p>
        <input className="btn-send-trade" type="submit" name="submit" value="Send new trade position" />
      </form>
      {/* </div> */}
    </div>
  );
}


export default connect(mapStoreToProps)(Trade);
