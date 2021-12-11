import React, { useState, useEffect } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './NotActive.css';


function NotActive(props) {

  // todo - default price value should automatically start out at the current price
  // of bitcoin, rounded to the closest $100
  const [transactionSide, setTransactionSide] = useState('buy');
  const [price, setTransactionPrice] = useState(0);
  const [transactionAmount, setTransactionAmount] = useState(0.001);
  const [transactionProduct, setTransactionProduct] = useState('BTC-USD');
  const [tradePairRatio, setTradePairRatio] = useState(1.1);
  const [fees, setFees] = useState(0.005);
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
  }

  const getCurrentPrice = (event) => {
    if (event) {
      event.preventDefault();
    }
    // check if the current price has been stored yet to prevent NaN errors
    if (props.store.statusReducer.tickerReducer.tickerPrice) {
      // round the price to nearest 100
      const roundedPrice = Math.round(props.store.statusReducer.tickerReducer.tickerPrice / 100) * 100;
      // change input box to reflect rounded value
      setTransactionPrice(roundedPrice)
    }
  }

  // when the page loads, get the account fees 
  useEffect(() => {
    dispatch({ type: 'FETCH_FEES' });
  }, [dispatch])


  // when the page loads, get the current price
  useEffect(() => {
    if (price === 0) {
      getCurrentPrice();
    }
  }, [getCurrentPrice])

  // once the account fees load into redux, 
  useEffect(() => {
    console.log('fees from useEffect:', props.store.accountReducer.feeReducer);
    setFees(props.store.accountReducer.feeReducer.maker_fee_rate)
  }, [props.store.accountReducer.feeReducer])


  return (
    <div className="NotActive" >
      <div className="scrollable boxed">
        <h3 className={`title ${props.theme}`}>You are not active!</h3>
        <center><p>You must store your API details from Coinbase Pro before you can trade. 
          You can do this in the settings.</p></center>

      </div>
      {/* <div className="spacer" > jgdsf</div> */}
    </div>
  );
}


export default connect(mapStoreToProps)(NotActive);
