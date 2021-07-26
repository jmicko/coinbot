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
  // todo - default price value should automatically start out at the current price
  // of bitcoin, rounded to the closest $100
  const [transactionSide, setTransactionSide] = useState('buy');
  const [price, setTransactionPrice] = useState(30000);
  const [transactionAmount, setTransactionAmount] = useState(0.001);
  const [transactionProduct, setTransactionProduct] = useState('BTC-USD');
  const [tradePairRatio, setTradePairRatio] = useState(1.1);
  const dispatch = useDispatch();

  function submitTransaction(event) {
    event.preventDefault();
    // calculate flipped price
    let original_sell_price = (Math.round((price * (Number(tradePairRatio) + 100))) / 100)
    dispatch({
      type: 'START_TRADE', payload: {
        original_sell_price: original_sell_price,
        original_buy_price: price,
        side: transactionSide,
        price: price,
        size: transactionAmount,
        product_id: transactionProduct
      }
    })
    console.log(`the price is: $${price} per 1 BTC`);
    console.log(`the amount is: ${transactionAmount} BTC`);
  }

  return (
    <div className="Trade boxed tall" >
      <h3 className="title">New Trade-Pair</h3>
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
            value={Number(price)}
            // todo - this could possibly be changed to 100, or add a selector menu thing to toggle between different amounts
            step={1}
            required
            onChange={(event) => setTransactionPrice(event.target.value)}
          />
          <div className="increment-buttons">
            <div className="increase">
              <input type="button" className="btn-green" onClick={(event) => setTransactionPrice(Number(price) + 1000)} value="+1000"></input>
              <input type="button" className="btn-green" onClick={(event) => setTransactionPrice(Number(price) + 100)} value="+100"></input>
              <input type="button" className="btn-green" onClick={(event) => setTransactionPrice(Number(price) + 10)} value="+10"></input>
            </div>
            <div className="decrease">
              <input type="button" className="btn-red" onClick={(event) => setTransactionPrice(Number(price) - 1000)} value="-1000"></input>
              <input type="button" className="btn-red" onClick={(event) => setTransactionPrice(Number(price) - 100)} value="-100"></input>
              <input type="button" className="btn-red" onClick={(event) => setTransactionPrice(Number(price) - 10)} value="-10"></input>
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
              <input type="button" className="btn-green" onClick={(event) => setTransactionAmount(Math.round(Number(transactionAmount) * 1000 + 1000) / 1000)} value="+1"></input>
              <input type="button" className="btn-green" onClick={(event) => setTransactionAmount(Math.round(Number(transactionAmount) * 1000 + 100) / 1000)} value="+.100"></input>
              <input type="button" className="btn-green" onClick={(event) => setTransactionAmount(Math.round(Number(transactionAmount) * 1000 + 10) / 1000)} value="+.010"></input>
              <input type="button" className="btn-green" onClick={(event) => setTransactionAmount(Math.round(Number(transactionAmount) * 1000 + 1) / 1000)} value="+.001"></input>
            </div>
            <div className="decrease">
              <input type="button" className="btn-red" onClick={(event) => setTransactionAmount(Math.round(Number(transactionAmount) * 1000 - 1000) / 1000)} value="-1"></input>
              <input type="button" className="btn-red" onClick={(event) => setTransactionAmount(Math.round(Number(transactionAmount) * 1000 - 100) / 1000)} value="-.100"></input>
              <input type="button" className="btn-red" onClick={(event) => setTransactionAmount(Math.round(Number(transactionAmount) * 1000 - 10) / 1000)} value="-.010"></input>
              <input type="button" className="btn-red" onClick={(event) => setTransactionAmount(Math.round(Number(transactionAmount) * 1000 - 1) / 1000)} value="-.001"></input>
            </div>
          </div>
        </div>


        <div className="number-inputs">
          {/* input for setting how much bitcoin should be traded per transaction at the specified price */}
          <label htmlFor="trade-pair-ratio">
            Trade pair ratio (percent):
          </label>
          <input
            type="number"
            name="trade-pair-ratio"
            value={Number(tradePairRatio)}
            step={0.001}
            required
            onChange={(event) => setTradePairRatio(Number(event.target.value))}
          />
          <div className="increment-buttons">
            <div className="increase">
              <input type="button" className="btn-green" onClick={(event) => setTradePairRatio(Math.round(Number(tradePairRatio) * 1000 + 1000) / 1000)} value="+1"></input>
              <input type="button" className="btn-green" onClick={(event) => setTradePairRatio(Math.round(Number(tradePairRatio) * 1000 + 100) / 1000)} value="+0.1"></input>

            </div>
            <div className="decrease">
              <input type="button" className="btn-red" onClick={(event) => setTradePairRatio(Math.round(Number(tradePairRatio) * 1000 - 1000) / 1000)} value="-1"></input>
              <input type="button" className="btn-red" onClick={(event) => setTradePairRatio(Math.round(Number(tradePairRatio) * 1000 - 100) / 1000)} value="-0.1"></input>
            </div>
          </div>
        </div>


        {/* display some details about the new transaction that is going to be made */}
        <input className="btn-send-trade btn-blue" type="submit" name="submit" value="Start New Trade-Pair" />
        <div className="boxed dark">
          <h4 className="title">New position</h4>
          <p className="info"><strong>BUY*:</strong> ${Math.round(price * transactionAmount * 100) / 100}</p>
          <p className="info"><strong>SELL*:</strong>${(Math.round((price* transactionAmount * (tradePairRatio + 100))) / 100)}</p>
          {/* todo - currently using .005 as the fee multiplier. Should GET account info from coinbase and use that instead */}
          <p className="info"><strong>FEE*:</strong> ${Math.round(price * transactionAmount * .5) / 100}</p>
          <p className="info"><strong>PAIR MARGIN*:</strong> ${(Math.round(( ((price* transactionAmount * (tradePairRatio + 100))) / 100 - (price * transactionAmount) )*100))/100}</p>
          {/* todo - currently using .005 as the fee multiplier. Should GET account info from coinbase and use that instead */}
          <p className="info"><strong>PAIR PROFIT*:</strong> ${(Math.round(( (Math.round((price* transactionAmount * (tradePairRatio + 100))) / 100) - (price * transactionAmount)  - (price * transactionAmount * .005) * 2)*100))/100}</p>
          <p className="info">
            This will tell coinbot to start trading {transactionAmount} BTC
            between the low purchase price of <strong>${price}</strong> and
            the high sell price of <strong>${(Math.round((price * (tradePairRatio + 100))) / 100)}</strong>.
            The value in USD for the initial transaction will be about ${((Math.round((price * transactionAmount) * 100)) / 100)}.
          </p>
          <p className="small info">*Costs, fees, margin, and profit, are estimated and may be different at time of transaction. This is mostly due to rounding issues market conditions.</p>
        </div>
      </form>
      {/* </div> */}
    </div>
  );
}


export default connect(mapStoreToProps)(Trade);
