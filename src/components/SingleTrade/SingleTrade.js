import React, { useEffect, useState } from 'react';
import { connect, useDispatch } from 'react-redux';
import mapStoreToProps from '../../redux/mapStoreToProps';
import './SingleTrade.css'

function SingleTrade(props) {
  const dispatch = useDispatch();
  const [profit, setProfit] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // if (props.store.accountReducer === undefined) {
    //   return
    // }
    // this formula is ridiculous but hey, at least I didn't inject it right into the html, right?
    const profit = Math.round((((props.order.original_sell_price * props.order.size - props.order.original_buy_price * props.order.size)) - ((props.store.accountReducer.feeReducer.maker_fee_rate * props.order.original_buy_price * props.order.size) + (props.store.accountReducer.feeReducer.maker_fee_rate * props.order.original_sell_price * props.order.size))) * 10000) / 10000;
    setProfit(profit);
  }, [props.store.accountReducer, props.order.original_sell_price, props.order.original_buy_price, props.order.size]);

  // delete the order if the abandon button is clicked.
  // the loop already detects deleted orders, so only need to make a call to coinbase
  // no need to bother the database if it is busy
  function deleteOrder() {
    console.log('clicked delete');
    setDeleting(true)
    dispatch({
      type: 'DELETE_TRADE', payload: {
        id: props.order.id,
      }
    })
  }

  // todo - probably need to refactor this thing asap. Should use more useState hooks to make these strings a bit less horrifying
  // postgres is much better at math using exact

  return (
    <div className={`Single-trade ${props.order.side}`}>
      <div className={"overlay"}>

        {(deleting === true)
          ? <p className="deleting">Deleting...</p>
          : <button className="btn-red" onClick={() => { deleteOrder() }}>Abandon</button>
        }
        <p className="single-trade-text">
          <strong>
            Price: </strong>
          {(props.order.side === 'sell')
            ? Number(props.order.original_sell_price)
            : Number(props.order.original_buy_price)
          } ~ <strong>
            {(props.order.side === 'sell')
              ? 'Bought at:'
              : 'Sells for:'
            } </strong>
          {(props.order.side === 'sell')
            ? Number(props.order.original_buy_price)
            : Number(props.order.original_sell_price)
          } ~ <strong>Size </strong>{Number(props.order.size)} ~
          <strong>Value</strong> ${Math.round((props.order.price * props.order.size) * 100) / 100} ~
          <strong> Pair Profitability</strong> ${profit}
        </p>
      </div>
    </div>
  )
}

export default connect(mapStoreToProps)(SingleTrade);