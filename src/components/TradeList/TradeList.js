import React, { useEffect, useState, useCallback } from 'react';
import { connect } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import SingleTrade from '../SingleTrade/SingleTrade'
import coinbotFilled from "../../../src/coinbotFilled.png";
// import coinbotFilledGif from "../../../src/coinbotFilled.gif";
import './TradeList.css'


function TradeList(props) {

  // these will store mapped arrays as html so they can be used after page loads
  const [buys, setBuys] = useState(<></>);
  const [sells, setSells] = useState(<></>);
  const [highestBuy, setHighestBuy] = useState(0);
  const [lowestSell, setLowestSell] = useState(0);


  // this watches the store and maps arrays to html when it changes because can't map nothing
  useEffect(() => {
    if (props.store.ordersReducer.openOrdersInOrder.sells !== undefined) {
      setLowestSell(Number(props.store.ordersReducer.openOrdersInOrder.sells[0]?.price || 0))
      setSells(props.store.ordersReducer.openOrdersInOrder.sells.reverse().map((sell) => {
        return <SingleTrade key={sell.id} order={sell} theme={props.theme} />
      }))
    }
    if (props.store.ordersReducer.openOrdersInOrder.buys !== undefined) {
      setHighestBuy(Number(props.store.ordersReducer.openOrdersInOrder.buys[0]?.price || 0))
      setBuys(props.store.ordersReducer.openOrdersInOrder.buys.map((sell) => {
        return <SingleTrade key={sell.id} order={sell} theme={props.theme} />
      }))
    }
  }, [props.store.ordersReducer.openOrdersInOrder.sells, props.store.ordersReducer.openOrdersInOrder.buys]);

  
  return (
    <div className="TradeList scrollable boxed">
      {/* map the sell array on top and buy array on bottom */}
      {sells}
      <div className='robot'>
        {lowestSell != 0 && highestBuy != 0 && <p>&#9650; ${(lowestSell - props.priceTicker).toFixed(2)}<br/>
        &#9660; ${(props.priceTicker - highestBuy).toFixed(2)}</p>}
        <img className="coinbot-image" src={coinbotFilled} alt="coinbot" />
        {lowestSell != 0 && highestBuy != 0 && <p><center><strong>Margin</strong><br/>${(lowestSell - highestBuy).toFixed(2)}</center></p>}
      </div>
      {buys}
    </div>
  )
}

export default connect(mapStoreToProps)(TradeList);